package com.payflow.provider

import org.springframework.stereotype.Service
import kotlin.random.Random

@Service
class MockPspProvider : PaymentsProvider {
    override val name: String = "mockpsp"
    override fun charge(amount: Long, currency: String, idempotencyKey: String): ProviderResult {
        val ok = Random.nextDouble() < 0.6
        return if (ok) ProviderResult(true, "Mock approved") else ProviderResult(false, "Mock decline")
    }
}