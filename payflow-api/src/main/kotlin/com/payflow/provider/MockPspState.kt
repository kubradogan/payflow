package com.payflow.provider

import org.springframework.stereotype.Component

data class FaultConfig(
    var failureRate: Double = 0.0, // Probability of simulated failure between 0 and 1
    var addLatencyMs: Long = 0,     // Artificial delay added to provider response
    var forceTimeout: Boolean = false // Forces a timeout to trigger failover
)

@Component
class MockPspState {
    // Holds the current fault configuration used by MockPspProvider
    val config = FaultConfig()
}