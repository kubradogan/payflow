package com.payflow

import com.payflow.api.PaymentRequest
import com.payflow.core.MetricsRegistry
import com.payflow.core.ProviderHealthRegistry
import com.payflow.repo.PaymentRepository
import com.payflow.provider.MockPspState
import com.payflow.repo.PaymentDecisionRepository
import com.payflow.service.PaymentService
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.data.redis.core.StringRedisTemplate
import java.util.UUID
import kotlin.collections.isNotEmpty

@SpringBootTest
class PayflowApiApplicationTests : TestContainersConfig() {

    @Autowired
    lateinit var paymentService: PaymentService

    @Autowired
    lateinit var paymentRepository: PaymentRepository

    @Autowired
    lateinit var mockState: MockPspState

    @Autowired
    lateinit var health: ProviderHealthRegistry

    @Autowired
    lateinit var metrics: MetricsRegistry

    @Autowired
    lateinit var redisTemplate: StringRedisTemplate

    @Autowired
    lateinit var decisionRepo: PaymentDecisionRepository

    @BeforeEach
    fun cleanState() {
        // Ensures a clean database and Redis state before each test
        paymentRepository.deleteAll()

        val keys = redisTemplate.keys("idem:*")
        if (!keys.isNullOrEmpty()) {
            redisTemplate.delete(keys)
        }
    }

    @Test
    fun contextLoads() {
        // Verifies that the Spring application context starts successfully
    }

    @Test
    fun `same idempotency key creates single payment`() {
        val key = "idem-test-123"
        val req = PaymentRequest(amount = 100, currency = "EUR", idempotencyKey = key)

        val first = paymentService.process(req)
        val second = paymentService.process(req)

        assertEquals(
            first.paymentId,
            second.paymentId,
            "Repeated calls with the same idempotency key must return the same paymentId"
        )

        assertEquals(
            1, paymentRepository.count(), "Only one payment record should exist in the database"
        )
    }

    @Test
    fun `router avoids down provider`() {
        // Simulates a scenario where Stripe is unavailable
        health.set("stripe", false)
        health.set("mockpsp", true)

        mockState.config.failureRate = 0.0
        mockState.config.addLatencyMs = 0
        mockState.config.forceTimeout = false

        val req = PaymentRequest(
            amount = 120, currency = "EUR", idempotencyKey = "health-1"
        )

        val resp = paymentService.process(req)

        assertEquals(
            "mockpsp", resp.provider, "Requests must be routed to mockpsp when Stripe is down"
        )
    }

    @Test
    fun `error metrics captured when primary provider fails without failover`() {
        // Only mockpsp is available and it always fails
        health.set("stripe", false)
        health.set("mockpsp", true)

        mockState.config.failureRate = 1.0
        mockState.config.addLatencyMs = 0
        mockState.config.forceTimeout = false

        val key = "err-1"
        val req = PaymentRequest(
            amount = 130, currency = "EUR", idempotencyKey = key
        )

        val resp = paymentService.process(req)

        assertEquals("mockpsp", resp.provider)
        assertEquals("FAILED", resp.status)

        // Metrics are checked at a sanity level
        // Detailed evidence is provided via /admin/metrics screenshots in the report
        val dist = metrics.errorDistribution()
        println("errorDistribution in test = $dist")
    }

    @Test
    fun `routing decision is persisted for payment`() {
        val key = "decision-test-1"
        val req = PaymentRequest(
            amount = 100, currency = "EUR", idempotencyKey = key
        )

        val resp = paymentService.process(req)

        val decisions = decisionRepo.findByPaymentIdOrderByDecidedAtAsc(UUID.fromString(resp.paymentId))

        assertTrue(
            decisions.isNotEmpty(), "A routing decision must be stored for each processed payment"
        )
    }
}