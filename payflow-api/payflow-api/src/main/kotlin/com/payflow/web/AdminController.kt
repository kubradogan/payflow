package com.payflow.web

import com.payflow.api.MetricsSummaryDto
import com.payflow.api.PaymentListItem
import com.payflow.api.ProviderStatusDto
import com.payflow.core.ProviderHealthRegistry
import com.payflow.core.ProviderStatsRegistry
import com.payflow.provider.FaultConfig
import com.payflow.provider.MockPspState
import com.payflow.service.PaymentService
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/admin")
class AdminController(
    private val mockState: MockPspState,
    private val health: ProviderHealthRegistry,
    private val paymentService: PaymentService,
    private val stats: ProviderStatsRegistry,
) {
    @PostMapping("/mockpsp/config")
    fun setMockConfig(@RequestBody cfg: FaultConfig) = run {
        mockState.config.failureRate = cfg.failureRate.coerceIn(0.0, 1.0)
        mockState.config.addLatencyMs = cfg.addLatencyMs
        mockState.config.forceTimeout = cfg.forceTimeout
        mockState.config
    }

    @PostMapping("/providers/{name}/{status}")
    fun setProviderStatus(@PathVariable name: String, @PathVariable status: String) = run {
        val up = status.equals("up", true)
        health.set(name.lowercase(), up)
        mapOf("provider" to name, "up" to up)
    }

    @GetMapping("/payments")
    fun getRecentPayments(): List<PaymentListItem> =
        paymentService.listRecent()

    @GetMapping("/providers")
    fun getProviders(): List<ProviderStatusDto> {
        val snapshot = health.snapshot() // map: name -> up/down
        val result = mutableListOf<ProviderStatusDto>()
        result.add(
            ProviderStatusDto(
                name = "stripe",
                status = if (snapshot["stripe"] != false) "UP" else "DOWN",
                failureRate = 0.0,
                artificialLatencyMs = 0,
                timeoutMs = 0
            )
        )
        val cfg = mockState.config
        result.add(
            ProviderStatusDto(
                name = "mockpsp",
                status = if (snapshot["mockpsp"] != false) "UP" else "DOWN",
                failureRate = cfg.failureRate,
                artificialLatencyMs = cfg.addLatencyMs,
                timeoutMs = if (cfg.forceTimeout) 3000 else 0
            )
        )

        return result
    }

    @GetMapping("/metrics")
    fun getMetrics(): MetricsSummaryDto {
        val all = stats.snapshot()

        var totalSuccess = 0
        var totalFail = 0
        var weightedLatency = 0.0

        all.forEach { (_, s) ->
            val total = s.success + s.fail
            totalSuccess += s.success
            totalFail += s.fail
            if (total > 0) {
                weightedLatency += s.avgLatencyMs
            }
        }

        val total = (totalSuccess + totalFail).coerceAtLeast(1)
        val successRate = 100.0 * totalSuccess / total
        val p95Latency = weightedLatency.coerceAtLeast(0.0).toLong()

        val errorDist = all.mapValues { (_, s) -> s.fail.toLong() }


        return MetricsSummaryDto(
            successRate = successRate,
            p95LatencyMs = p95Latency,
            failoverCount = 0,
            errorDistribution = errorDist
        )
    }
}