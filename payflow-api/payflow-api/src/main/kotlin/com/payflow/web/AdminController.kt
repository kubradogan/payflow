package com.payflow.web

import com.payflow.api.PaymentListItem
import com.payflow.api.PaymentPageResponse
import com.payflow.core.MetricsRegistry
import com.payflow.core.ProviderHealthRegistry
import com.payflow.core.ProviderStatsRegistry
import com.payflow.provider.FaultConfig
import com.payflow.provider.MockPspState
import com.payflow.service.PaymentService
import org.springframework.web.bind.annotation.*


data class AdminMetricsResponse(
    val successRate: Double,
    val p95LatencyMs: Long,
    val failoverCount: Long,
    val errorDistribution: Map<String, Long>
)

@RestController
@RequestMapping("/admin")
class AdminController(
    private val mockState: MockPspState,
    private val health: ProviderHealthRegistry,
    private val paymentService: PaymentService,
    private val stats: ProviderStatsRegistry,
    private val metrics: MetricsRegistry
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

    @GetMapping("/providers")
    fun getProviders() = health.snapshot()

    @GetMapping("/metrics")
    fun getMetrics(): AdminMetricsResponse {
        val snapshot = stats.snapshot()

        val totalSuccess = snapshot.values.sumOf { it.success.toLong() }
        val totalFail = snapshot.values.sumOf { it.fail.toLong() }
        val total = (totalSuccess + totalFail).coerceAtLeast(1)

        val successRate = totalSuccess.toDouble() / total

        val allLatencies: List<Long> = snapshot.values.flatMap { it.latencies }
        val p95 = computeP95(allLatencies)

        return AdminMetricsResponse(
            successRate = successRate,
            p95LatencyMs = p95,
            failoverCount = metrics.failoverCount(),
            errorDistribution = metrics.errorDistribution()
        )
    }

    private fun computeP95(latencies: List<Long>): Long {
        if (latencies.isEmpty()) return 0
        val sorted = latencies.sorted()
        val index = ((sorted.size - 1) * 0.95).toInt().coerceIn(0, sorted.size - 1)
        return sorted[index]
    }

    @GetMapping("/payments")
    fun getPayments(
        @RequestParam(required = false, name = "query") query: String?,
        @RequestParam(required = false, name = "status") status: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "30") size: Int
    ): PaymentPageResponse {
        return paymentService.searchPayments(query, status, page, size)
    }
}