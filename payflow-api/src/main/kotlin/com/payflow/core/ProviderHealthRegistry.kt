package com.payflow.core

import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap

@Component
class ProviderHealthRegistry {

    // Keeps the current UP/DOWN status of each payment provider
    private val providers = ConcurrentHashMap<String, Boolean>()

    init {
        // Initial state both providers are marked as available
        providers["stripe"] = true
        providers["mockpsp"] = true
    }

    // Updates provider availability status from admin controls
    fun set(name: String, up: Boolean) {
        providers[name.lowercase()] = up
    }

    // Checks whether a provider is currently considered available
    fun isUp(name: String): Boolean =
        providers.getOrDefault(name.lowercase(), true)

    // Returns a snapshot of all provider health states
    fun snapshot(): Map<String, Boolean> = providers.toMap()
}