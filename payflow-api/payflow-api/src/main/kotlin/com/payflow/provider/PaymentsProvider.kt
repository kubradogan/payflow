package com.payflow.provider

data class ProviderResult(val success: Boolean, val message: String? = null)

interface PaymentsProvider {
    val name: String
    fun charge(amount: Long, currency: String, idempotencyKey: String): ProviderResult
}