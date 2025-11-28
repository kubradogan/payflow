package com.payflow.core

import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

@Component
class ProviderStatsRegistry {

    data class Stats(
        var success: Int = 0,
        var fail: Int = 0,
        var avgLatencyMs: Double = 200.0
    )

    private val stats = ConcurrentHashMap<String, Stats>()
    private val failoverCount = AtomicInteger(0)

    fun report(name: String, success: Boolean, latency: Long) {
        val s = stats.computeIfAbsent(name) { Stats() }
        if (success) s.success++ else s.fail++
        s.avgLatencyMs = 0.8 * s.avgLatencyMs + 0.2 * latency.toDouble()
    }

    fun get(name: String): Stats = stats.getOrDefault(name, Stats())
    fun recordFailover() {
        failoverCount.incrementAndGet()
    }
    data class GlobalMetrics(
        val successRate: Double,
        val p95LatencyMs: Long,
        val failoverCount: Int,
        val errorDistribution: Map<String, Int>
    )

    fun global(): GlobalMetrics {
        val entries = stats.entries.toList()
        if (entries.isEmpty()) {
            return GlobalMetrics(
                successRate = 0.0,
                p95LatencyMs = 0,
                failoverCount = failoverCount.get(),
                errorDistribution = emptyMap()
            )
        }

        var totalSuccess = 0
        var totalFail = 0
        var weightedLatency = 0.0

        for ((_, s) in entries) {
            val total = s.success + s.fail
            if (total == 0) continue
            totalSuccess += s.success
            totalFail += s.fail
            weightedLatency += s.avgLatencyMs * total
        }

        val totalOps = totalSuccess + totalFail
        if (totalOps == 0) {
            return GlobalMetrics(
                successRate = 0.0,
                p95LatencyMs = 0,
                failoverCount = failoverCount.get(),
                errorDistribution = entries.associate { it.key to it.value.fail }
            )
        }

        val successRate = totalSuccess.toDouble() / totalOps
        val p95Approx = (weightedLatency / totalOps).toLong()

        val errorDist = entries.associate { (name, s) -> name to s.fail }

        return GlobalMetrics(
            successRate = successRate,
            p95LatencyMs = p95Approx,
            failoverCount = failoverCount.get(),
            errorDistribution = errorDist
        )
    }
}