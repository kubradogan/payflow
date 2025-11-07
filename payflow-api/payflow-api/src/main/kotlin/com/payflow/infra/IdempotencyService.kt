package com.payflow.infra

import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Component
import java.time.Duration

@Component
class IdempotencyService(
    private val redis: StringRedisTemplate
) {
    private val TTL = Duration.ofMinutes(30)

    fun tryAcquire(key: String, value: String): Boolean {
        val ops = redis.opsForValue()
        return ops.setIfAbsent("idem:$key", value, TTL) == true
    }

    fun get(key: String): String? = redis.opsForValue().get("idem:$key")

    fun setResult(key: String, value: String) {
        redis.opsForValue().set("idem:$key", value, TTL)
    }
}