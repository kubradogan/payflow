package com.payflow.infra

import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Component
import java.time.Duration

@Component
class IdempotencyService(
    private val redis: StringRedisTemplate
) {

    // Time-to-live for idempotency keys to avoid permanent storage
    private val TTL = Duration.ofMinutes(30)

    fun tryAcquire(key: String, value: String): Boolean {
        val ops = redis.opsForValue()

        // First request wins, later requests with same key are rejected
        return ops.setIfAbsent("idem:$key", value, TTL) == true
    }

    // Used to read previously stored result for the same idempotency key
    fun get(key: String): String? = redis.opsForValue().get("idem:$key")

    // Stores the final result so repeated requests return the same outcome
    fun setResult(key: String, value: String) {
        redis.opsForValue().set("idem:$key", value, TTL)
    }
}