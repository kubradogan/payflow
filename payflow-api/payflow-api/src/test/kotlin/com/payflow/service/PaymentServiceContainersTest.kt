package com.payflow.service

import com.payflow.api.PaymentRequest
import com.payflow.core.MetricsRegistry
import com.payflow.core.ProviderHealthRegistry
import com.payflow.provider.MockPspState
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.containers.GenericContainer
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.junit.jupiter.api.Disabled

@Disabled("Testcontainers E2E – optional, runs only locally if configured")
@SpringBootTest
@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class PaymentServiceContainersTest @Autowired constructor(
    private val paymentService: PaymentService,
    private val healthRegistry: ProviderHealthRegistry,
    private val mockState: MockPspState,
    private val metrics: MetricsRegistry
) {

    companion object {
        @Container
        @JvmStatic
        val postgres: PostgreSQLContainer<Nothing> =
            PostgreSQLContainer<Nothing>("postgres:16-alpine").apply {
                withDatabaseName("payflow_test")
                withUsername("payflow")
                withPassword("payflow")
            }

        @Container
        @JvmStatic
        val redis: GenericContainer<Nothing> =
            GenericContainer<Nothing>("redis:7-alpine").apply {
                withExposedPorts(6379)
            }

        @JvmStatic
        @DynamicPropertySource
        fun registerProperties(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url") { postgres.jdbcUrl }
            registry.add("spring.datasource.username") { postgres.username }
            registry.add("spring.datasource.password") { postgres.password }

            registry.add("spring.data.redis.host") { redis.host }
            registry.add("spring.data.redis.port") { redis.getMappedPort(6379) }
        }
    }

    @Test
    fun `happy path payment is processed once per idempotency key`() {
        healthRegistry.set("stripe", true)
        healthRegistry.set("mockpsp", true)

        mockState.config.failureRate = 0.0
        mockState.config.addLatencyMs = 0
        mockState.config.forceTimeout = false

        val key = "containers-happy-1"

        val req = PaymentRequest(
            amount = 1000L,
            currency = "EUR",
            idempotencyKey = key
        )

        val resp1 = paymentService.process(req)
        val resp2 = paymentService.process(req)

        Assertions.assertEquals(resp1.paymentId, resp2.paymentId)
        Assertions.assertEquals(resp1.status, resp2.status)
    }

    @Test
    fun `failover works when primary mockpsp times out`() {
        healthRegistry.set("stripe", true)
        healthRegistry.set("mockpsp", true)

        mockState.config.failureRate = 0.0
        mockState.config.addLatencyMs = 0
        mockState.config.forceTimeout = true

        val key = "containers-failover-1"

        val req = PaymentRequest(
            amount = 1500L,
            currency = "EUR",
            idempotencyKey = key
        )

        val resp = paymentService.process(req)

        Assertions.assertEquals("stripe", resp.provider)
        Assertions.assertEquals("SUCCEEDED", resp.status)
        Assertions.assertTrue(metrics.failoverCount() >= 1L)
    }
}