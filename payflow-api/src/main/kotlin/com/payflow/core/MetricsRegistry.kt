package com.payflow.core

import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

@Component
class MetricsRegistry {

    // Counts how many times the system had to switch to an alternative provider
    private val failover = AtomicLong(0)

    // Stores error counts grouped by error type or reason
    private val errors = ConcurrentHashMap<String, Long>()

    // Called when a routing failover occurs
    fun incFailover() {
        failover.incrementAndGet()
    }

    // Records an error occurrence for basic monitoring and reporting
    fun recordError(type: String) {
        errors.merge(type, 1L) { old, one -> old + one }
    }

    // Returns total number of failover events
    fun failoverCount(): Long = failover.get()

    // Returns a snapshot of recorded error types and their counts
    fun errorDistribution(): Map<String, Long> = errors.toMap()
}