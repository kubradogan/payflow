package com.payflow.provider

import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Service

// Default provider used when multiple implementations are available
@Primary
@Service
class StripeStubProvider : PaymentsProvider {

    // Logical provider name used in routing and persistence
    override val name: String = "stripe"

    // Simulates a successful payment without external dependency
    override fun charge(amount: Long, currency: String, idempotencyKey: String): ProviderResult {
        return ProviderResult(
            success = true,
            message = "Stripe approved"
        )
    }
}