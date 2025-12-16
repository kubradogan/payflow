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
    // Small DTO returned to the service layer: selected provider and brief explanation
    data class Decision(val providerName: String, val provider: PaymentsProvider, val reason: String)

    fun chooseProvider(): Decision {
        // Start with the two known providers and keep only those currently marked as UP
        val candidates = listOf(
            stripe.name to stripe,
            mock.name to mock
        ).filter { (n, _) -> health.isUp(n) }

        // If everything is DOWN degrade to a deterministic fallback for the demo
        if (candidates.isEmpty()) {
            return Decision("stripe", stripe, "all-down-degrade")
        }

        var best: Pair<String, PaymentsProvider>? = null
        var bestScore = Double.NEGATIVE_INFINITY

        // Score each candidate using lightweight runtime stats
        for ((name, prov) in candidates) {
            val s = stats.get(name)
            val total = (s.success + s.fail).coerceAtLeast(1)

            // Keep the scoring simple and explainable
            val successRate = s.success.toDouble() / total
            val latencyNorm = (s.avgLatencyMs / 1000.0).coerceIn(0.0, 1.0)

            // Demo assumption MockPSP is cheaper Stripe is more expensive
            val costWeight = when (name) {
                "mockpsp" -> 0.8
                "stripe" -> 0.4
                else -> 0.5
            }

            // Weighted sum: reliability + latency + cost
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
        // Short score string keeps logs and UI readable
        val scoreStr = "%.3f".format(bestScore)
        return Decision(pname, p, "score=$scoreStr")
    }

    // Called by PaymentService after each provider attempt to update rolling stats
    fun report(name: String, success: Boolean, latencyMs: Long) =
        stats.report(name, success, latencyMs)

    fun chooseProviderExcluding(exclude: String): Decision {
        // Used for failover: pick a provider while ignoring the one that just failed
        val ex = exclude.lowercase()

        val candidates = listOf(
            stripe.name to stripe,
            mock.name to mock
        ).filter { (n, _) -> health.isUp(n) && n.lowercase() != ex }

        // No alternative available: return the same provider name and explain why
        if (candidates.isEmpty()) {
            val fallback = when (ex) {
                stripe.name -> stripe
                mock.name -> mock
                else -> stripe
            }
            return Decision(ex, fallback, "no-alternative")
        }

        var best: Pair<String, PaymentsProvider>? = null
        var bestScore = Double.NEGATIVE_INFINITY

        for ((name, prov) in candidates) {
            val s = stats.get(name)
            val total = (s.success + s.fail).coerceAtLeast(1)

            val successRate = s.success.toDouble() / total
            val latencyNorm = (s.avgLatencyMs / 1000.0).coerceIn(0.0, 1.0)

            val costWeight = when (name) {
                "mockpsp" -> 0.8
                "stripe" -> 0.4
                else -> 0.5
            }

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
        val scoreStr = "%.3f".format(bestScore)   // keep the reason short
        return Decision(pname, p, "score=$scoreStr")
    }
}