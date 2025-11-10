package com.payflow.provider

import org.springframework.stereotype.Service

@Service
class MockPspProvider(
    private val state: MockPspState
) : PaymentsProvider {
    override val name: String = "mockpsp"

    override fun charge(amount: Long, currency: String, idempotencyKey: String): ProviderResult {
        val cfg = state.config

        if (cfg.forceTimeout) {
            Thread.sleep(3000)
            return ProviderResult(false, "timeout")
        }
        if (cfg.addLatencyMs > 0) Thread.sleep(cfg.addLatencyMs)

        val ok = Math.random() > cfg.failureRate
        return if (ok) ProviderResult(true, "Mock approved") else ProviderResult(false, "Mock decline")
    }
}