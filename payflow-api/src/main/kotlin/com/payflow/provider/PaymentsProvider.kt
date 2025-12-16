package com.payflow.provider

// Result returned by a payment provider after a charge attempt
data class ProviderResult(
    val success: Boolean,
    val message: String? = null
)

// Common abstraction for all payment providers
interface PaymentsProvider {
    val name: String

    // Executes a charge request using provider specific logic
    fun charge(amount: Long, currency: String, idempotencyKey: String): ProviderResult
}