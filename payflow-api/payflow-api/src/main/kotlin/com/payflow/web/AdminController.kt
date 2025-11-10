package com.payflow.web

import com.payflow.core.ProviderHealthRegistry
import com.payflow.provider.FaultConfig
import com.payflow.provider.MockPspState
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/admin")
class AdminController(
    private val mockState: MockPspState,
    private val health: ProviderHealthRegistry
) {
    @PostMapping("/mockpsp/config")
    fun setMockConfig(@RequestBody cfg: FaultConfig) = run {
        mockState.config.failureRate = cfg.failureRate.coerceIn(0.0, 1.0)
        mockState.config.addLatencyMs = cfg.addLatencyMs
        mockState.config.forceTimeout = cfg.forceTimeout
        mockState.config
    }

    @PostMapping("/providers/{name}/{status}")
    fun setProviderStatus(@PathVariable name: String, @PathVariable status: String) = run {
        val up = status.equals("up", true)
        health.set(name.lowercase(), up)
        mapOf("provider" to name, "up" to up)
    }

    @GetMapping("/providers")
    fun getProviders() = health.snapshot()
}