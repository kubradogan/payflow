package com.payflow.provider

import org.springframework.stereotype.Service

@Service
class MockPspProvider(
    private val state: MockPspState
) : PaymentsProvider {
    override val name: String = "mockpsp"

    override fun charge(amount: Long, currency: String, idempotencyKey: String): ProviderResult {
        val cfg = state.config

        // Forced timeout used to demonstrate failover behaviour
        if (cfg.forceTimeout) {
            // Delay kept below 2 seconds to trigger failover quickly
            Thread.sleep(800)
            throw RuntimeException("MockPSP forced timeout for failover demo")
        }

        // Optional artificial latency to simulate slow provider response
        if (cfg.addLatencyMs > 0) {
            Thread.sleep(cfg.addLatencyMs.toLong())
        }

        // Random failure simulation based on configured failure rate
        val rnd = Math.random()
        val failed = rnd < cfg.failureRate
        return if (failed) {
            ProviderResult(
                success = false,
                message = "Mock decline"
            )
        } else {
            ProviderResult(
                success = true,
                message = "Mock approved"
            )
        }
    }
}