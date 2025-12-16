package com.payflow.core

import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

@Component
class ProviderStatsRegistry {

    // Immutable view exposed to other layers
    data class Stat(
        val success: Long,
        val fail: Long,
        val avgLatencyMs: Long,
        val latencies: List<Long>
    )

    // Internal mutable state used for accumulation
    private data class MutableStat(
        var success: Long = 0,
        var fail: Long = 0,
        var totalLatencyMs: Long = 0,
        var count: Long = 0,
        val latencies: MutableList<Long> = CopyOnWriteArrayList()
    )

    // Holds runtime statistics per provider
    private val stats = ConcurrentHashMap<String, MutableStat>()

    // Called after each provider invocation to record outcome and latency
    fun report(providerName: String, success: Boolean, latencyMs: Long) {
        val s = stats.computeIfAbsent(providerName) { MutableStat() }
        synchronized(s) {
            if (success) s.success++ else s.fail++
            s.totalLatencyMs += latencyMs
            s.count++
            s.latencies.add(latencyMs)
        }
    }

    // Returns a snapshot used by the router scoring logic
    fun get(providerName: String): Stat {
        val s = stats[providerName] ?: MutableStat()
        val avg = if (s.count == 0L) 0L else s.totalLatencyMs / s.count
        return Stat(
            success = s.success,
            fail = s.fail,
            avgLatencyMs = avg,
            latencies = s.latencies.toList()
        )
    }

    // Returns a full snapshot for admin metrics endpoint
    fun snapshot(): Map<String, Stat> {
        return stats.mapValues { (_, s) ->
            val avg = if (s.count == 0L) 0L else s.totalLatencyMs / s.count
            Stat(
                success = s.success,
                fail = s.fail,
                avgLatencyMs = avg,
                latencies = s.latencies.toList()
            )
        }
    }
}