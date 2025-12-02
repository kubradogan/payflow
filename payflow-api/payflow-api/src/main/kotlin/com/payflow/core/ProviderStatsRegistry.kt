package com.payflow.core

import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

@Component
class ProviderStatsRegistry {

    /**
     * Dışarıya expose ettiğimiz immutable görünüm
     */
    data class Stat(
        val success: Long,
        val fail: Long,
        val avgLatencyMs: Long,
        val latencies: List<Long>
    )

    /**
     * İçeride mutable tuttuğumuz state
     */
    private data class MutableStat(
        var success: Long = 0,
        var fail: Long = 0,
        var totalLatencyMs: Long = 0,
        var count: Long = 0,
        val latencies: MutableList<Long> = CopyOnWriteArrayList()
    )

    private val stats = ConcurrentHashMap<String, MutableStat>()

    /**
     * Router üzerinden her çağrı sonrası buraya düşüyor:
     * router.report(providerName, success, latencyMs)
     */
    fun report(providerName: String, success: Boolean, latencyMs: Long) {
        val s = stats.computeIfAbsent(providerName) { MutableStat() }
        synchronized(s) {
            if (success) s.success++ else s.fail++
            s.totalLatencyMs += latencyMs
            s.count++
            s.latencies.add(latencyMs)
        }
    }

    /**
     * EnhancedRouter içindeki skor hesaplama için tek servisin snapshot'ı
     */
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

    /**
     * Admin /metrics için tüm provider'ların anlık snapshot'ı
     */
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