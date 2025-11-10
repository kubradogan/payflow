package com.payflow.core

import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap

@Component
class ProviderStatsRegistry {
    data class Stats(var success: Int = 0, var fail: Int = 0, var avgLatencyMs: Double = 200.0)
    private val stats = ConcurrentHashMap<String, Stats>()
    fun report(name: String, success: Boolean, latency: Long) {
        val s = stats.computeIfAbsent(name) { Stats() }
        if (success) s.success++ else s.fail++
        s.avgLatencyMs = 0.8 * s.avgLatencyMs + 0.2 * latency.toDouble()
    }
    fun get(name: String): Stats = stats.getOrDefault(name, Stats())
}