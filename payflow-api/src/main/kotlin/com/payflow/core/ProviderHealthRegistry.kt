package com.payflow.core

import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap

@Component
class ProviderHealthRegistry {

    private val providers = ConcurrentHashMap<String, Boolean>()

    init {
        // başlangıç durumu: her ikisi de UP
        providers["stripe"] = true
        providers["mockpsp"] = true
    }

    fun set(name: String, up: Boolean) {
        providers[name.lowercase()] = up
    }

    fun isUp(name: String): Boolean =
        providers.getOrDefault(name.lowercase(), true)

    fun snapshot(): Map<String, Boolean> = providers.toMap()
}