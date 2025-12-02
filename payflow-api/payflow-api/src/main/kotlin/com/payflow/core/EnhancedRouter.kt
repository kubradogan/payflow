package com.payflow.core

import com.payflow.provider.MockPspProvider
import com.payflow.provider.PaymentsProvider
import com.payflow.provider.StripeStubProvider
import org.springframework.stereotype.Component

@Component
class EnhancedRouter(
    private val health: ProviderHealthRegistry,
    private val stats: ProviderStatsRegistry,
    private val stripe: StripeStubProvider,
    private val mock: MockPspProvider
) {
    data class Decision(val providerName: String, val provider: PaymentsProvider, val reason: String)

    fun chooseProvider(): Decision {
        val candidates = listOf(
            stripe.name to stripe,
            mock.name to mock
        ).filter { (n, _) -> health.isUp(n) }

        if (candidates.isEmpty()) {
            return Decision("stripe", stripe, "all-down-degrade")
        }

        var best: Pair<String, PaymentsProvider>? = null
        var bestScore = Double.NEGATIVE_INFINITY

        for ((name, prov) in candidates) {
            val s = stats.get(name)
            val total = (s.success + s.fail).coerceAtLeast(1)

            val successRate = s.success.toDouble() / total
            val latencyNorm = (s.avgLatencyMs / 1000.0).coerceIn(0.0, 1.0)

            //mock ucuz, stripe pahalı
            val costWeight = when (name) {
                "mockpsp" -> 0.8
                "stripe" -> 0.4
                else -> 0.5
            }

            // Doğru scoring
            val score =
                0.4 * successRate +
                        0.4 * (1 - latencyNorm) +
                        0.2 * costWeight

            if (score > bestScore) {
                bestScore = score
                best = name to prov
            }
        }

        val (pname, p) = best!!
        return Decision(pname, p, "score=$bestScore")
    }

    fun report(name: String, success: Boolean, latencyMs: Long) =
        stats.report(name, success, latencyMs)
}