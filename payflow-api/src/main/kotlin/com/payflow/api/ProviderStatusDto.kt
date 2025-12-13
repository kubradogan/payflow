package com.payflow.api

data class ProviderStatusDto(
    val name: String,
    val status: String,
    val failureRate: Double,
    val artificialLatencyMs: Long,
    val timeoutMs: Long
)