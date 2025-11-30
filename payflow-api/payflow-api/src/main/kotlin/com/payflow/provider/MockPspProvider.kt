package com.payflow.provider

import org.springframework.stereotype.Service

@Service
class MockPspProvider(
    private val state: MockPspState
) : PaymentsProvider {
    override val name: String = "mockpsp"

    override fun charge(amount: Long, currency: String, idempotencyKey: String): ProviderResult {
        val cfg = state.config

        //Force timeout senaryosu: failover tetiklemek için
        if (cfg.forceTimeout) {
            // < 2s içinde failover istiyoruz → ~800ms gecikme simüle et
            Thread.sleep(800)
            throw RuntimeException("MockPSP forced timeout for failover demo")
        }

        //Normal latency simulasyonu
        if (cfg.addLatencyMs > 0) {
            Thread.sleep(cfg.addLatencyMs.toLong())
        }
        //Random failure
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