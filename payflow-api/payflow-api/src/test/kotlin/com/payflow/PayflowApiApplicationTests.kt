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
class PayflowApiApplicationTests {

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
        // Her testten önce DB ve Redis temizle
        paymentRepository.deleteAll()

        val keys = redisTemplate.keys("idem:*")
        if (!keys.isNullOrEmpty()) {
            redisTemplate.delete(keys)
        }
    }

    @Test
    fun contextLoads() {
        // boş test
    }

    @Test
    fun `same idempotency key creates single payment`() {
        val key = "idem-test-123"
        val req = PaymentRequest(amount = 100, currency = "EUR", idempotencyKey = key)

        val first = paymentService.process(req)
        val second = paymentService.process(req)

        assertEquals(first.paymentId, second.paymentId, "Idempotent çağrılar aynı paymentId'yi döndürmeli")
        assertEquals(1, paymentRepository.count(), "Veritabanında tek bir payment kaydı olmalı")
    }

    @Test
    fun `router avoids down provider`() {
        // Stripe DOWN MockPSP UP
        health.set("stripe", false)
        health.set("mockpsp", true)

        mockState.config.failureRate = 0.0
        mockState.config.addLatencyMs = 0
        mockState.config.forceTimeout = false

        val req = PaymentRequest(amount = 120, currency = "EUR", idempotencyKey = "health-1")
        val resp = paymentService.process(req)

        assertEquals("mockpsp", resp.provider, "Stripe DOWN iken isteklerin mockpsp'ye yönlenmesi gerekir")
    }

    @Test
    fun `error metrics captured when primary provider fails without failover`() {
        // Stripe DOWN sadece MockPSP
        health.set("stripe", false)
        health.set("mockpsp", true)

        mockState.config.failureRate = 1.0   // fail
        mockState.config.addLatencyMs = 0
        mockState.config.forceTimeout = false

        val key = "err-1"
        val req = PaymentRequest(amount = 130, currency = "EUR", idempotencyKey = key)

        val resp = paymentService.process(req)

        assertEquals("mockpsp", resp.provider)
        assertEquals("FAILED", resp.status)

        val dist = metrics.errorDistribution()
        val count = dist["primary-decline-no-failover"] ?: 0L
        assertTrue(count >= 1L, "primary-decline-no-failover metriği en az 1 olmalı, actual=$count")
    }

    @Test
    fun `routing decision is persisted for payment`() {
        val key = "decision-test-1"
        val req = PaymentRequest(amount = 100, currency = "EUR", idempotencyKey = key)

        val resp = paymentService.process(req)

        val decisions = decisionRepo.findByPaymentId(UUID.fromString(resp.paymentId))
        assertTrue(decisions.isNotEmpty(), "Routing decision should be stored for this payment")
    }
}