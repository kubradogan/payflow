package com.payflow.api

/*
 * Data transfer object used by admin endpoints
 * to expose the current state of a payment provider.
 */
data class ProviderStatusDto(
    // Logical provider name (e.g. Stripe, MockPSP)
    val name: String,

    // Current availability state (UP / DOWN)
    val status: String,

    // Configured failure rate used for fault injection
    val failureRate: Double,

    // Artificial delay added to provider responses (milliseconds)
    val artificialLatencyMs: Long,

    // Timeout threshold applied to provider calls (milliseconds)
    val timeoutMs: Long
)