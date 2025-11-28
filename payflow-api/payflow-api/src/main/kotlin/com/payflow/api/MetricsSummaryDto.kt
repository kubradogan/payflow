package com.payflow.api

data class MetricsSummaryDto(
    val successRate: Double,
    val p95LatencyMs: Long,
    val failoverCount: Long,
    val errorDistribution: Map<String, Long>
)