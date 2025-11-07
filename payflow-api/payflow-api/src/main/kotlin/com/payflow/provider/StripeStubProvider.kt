package com.payflow.provider

import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Service

@Primary
@Service
class StripeStubProvider : PaymentsProvider {
    override val name: String = "stripe"
    override fun charge(amount: Long, currency: String, idempotencyKey: String): ProviderResult {
        return ProviderResult(success = true, message = "ok:txn_123_demo")
    }
}