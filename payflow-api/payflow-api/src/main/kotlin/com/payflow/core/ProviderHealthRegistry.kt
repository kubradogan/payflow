package com.payflow.core

import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap

@Component
class ProviderHealthRegistry {
    private val map = ConcurrentHashMap<String, Boolean>()
    fun set(name: String, up: Boolean) { map[name] = up }
    fun isUp(name: String): Boolean = map.getOrDefault(name, true)
    fun snapshot(): Map<String, Boolean> = map.toMap()
}