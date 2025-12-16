package com.payflow.web

import com.payflow.api.PaymentDecisionDto
import com.payflow.api.PaymentPageResponse
import com.payflow.core.MetricsRegistry
import com.payflow.core.ProviderHealthRegistry
import com.payflow.core.ProviderStatsRegistry
import com.payflow.provider.FaultConfig
import com.payflow.provider.MockPspState
import com.payflow.repo.PaymentDecisionRepository
import com.payflow.service.PaymentService
import org.springframework.web.bind.annotation.*
import java.util.UUID

// Aggregated metrics returned to the admin dashboard
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
    private val metrics: MetricsRegistry,
    private val decisionRepo: PaymentDecisionRepository
) {

    // Updates fault injection settings for the mock payment provider
    @PostMapping("/mockpsp/config")
    fun setMockConfig(@RequestBody cfg: FaultConfig) = run {
        mockState.config.failureRate = cfg.failureRate.coerceIn(0.0, 1.0)
        mockState.config.addLatencyMs = cfg.addLatencyMs
        mockState.config.forceTimeout = cfg.forceTimeout
        mockState.config
    }

    // Marks a provider as up or down for routing and failover testing
    @PostMapping("/providers/{name}/{status}")
    fun setProviderStatus(@PathVariable name: String, @PathVariable status: String) = run {
        val up = status.equals("up", true)
        health.set(name.lowercase(), up)
        mapOf("provider" to name, "up" to up)
    }

    // Returns current availability status of all providers
    @GetMapping("/providers")
    fun getProviders() = health.snapshot()

    // Returns aggregated runtime metrics for monitoring and evaluation
    @GetMapping("/metrics")
    fun getMetrics(): AdminMetricsResponse {
        val snapshot = stats.snapshot()

        val totalSuccess = snapshot.values.sumOf { it.success }
        val totalFail = snapshot.values.sumOf { it.fail }
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

    // Computes the 95th percentile latency from collected samples
    private fun computeP95(latencies: List<Long>): Long {
        if (latencies.isEmpty()) return 0
        val sorted = latencies.sorted()
        val index = ((sorted.size - 1) * 0.95).toInt().coerceIn(0, sorted.size - 1)
        return sorted[index]
    }

    // Returns paginated payment list for admin inspection
    @GetMapping("/payments")
    fun getPayments(
        @RequestParam(required = false, name = "query") query: String?,
        @RequestParam(required = false, name = "status") status: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "30") size: Int
    ): PaymentPageResponse {
        return paymentService.searchPayments(query, status, page, size)
    }

    // Returns routing decision history for a specific payment
    @GetMapping("/payments/{id}/decisions")
    fun getPaymentDecisions(@PathVariable id: String): List<PaymentDecisionDto> {
        val paymentId = UUID.fromString(id)
        val decisions = decisionRepo.findByPaymentIdOrderByDecidedAtAsc(paymentId)

        return decisions.map {
            PaymentDecisionDto(
                chosenProvider = it.chosenProvider,
                reason = it.reason,
                decidedAt = it.decidedAt
            )
        }
    }
}