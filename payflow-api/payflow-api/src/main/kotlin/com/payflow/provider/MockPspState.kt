package com.payflow.provider

import org.springframework.stereotype.Component

data class FaultConfig(
    var failureRate: Double = 0.0, // 0..1
    var addLatencyMs: Long = 0,
    var forceTimeout: Boolean = false
)

@Component
class MockPspState {
    val config = FaultConfig()
}