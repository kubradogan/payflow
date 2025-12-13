package com.payflow.core

import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

@Component
class MetricsRegistry {

    private val failover = AtomicLong(0)
    private val errors = ConcurrentHashMap<String, Long>()

    fun incFailover() {
        failover.incrementAndGet()
    }

    fun recordError(type: String) {
        errors.merge(type, 1L) { old, one -> old + one }
    }

    fun failoverCount(): Long = failover.get()

    fun errorDistribution(): Map<String, Long> = errors.toMap()
}