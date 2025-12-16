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

// Endtoend style test using real Postgres + Redis containers
// Kept disabled for normal CI runs because it is slower and requires Docker
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
        // Ephemeral PostgreSQL used for persistence verification
        @Container
        @JvmStatic
        val postgres: PostgreSQLContainer<Nothing> =
            PostgreSQLContainer<Nothing>("postgres:16-alpine").apply {
                withDatabaseName("payflow_test")
                withUsername("payflow")
                withPassword("payflow")
            }

        // Ephemeral Redis used for idempotency lock and result storage
        @Container
        @JvmStatic
        val redis: GenericContainer<Nothing> =
            GenericContainer<Nothing>("redis:7-alpine").apply {
                withExposedPorts(6379)
            }

        // Inject container connection details into Spring Boot at runtime
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
        // Both providers available for normal routing
        healthRegistry.set("stripe", true)
        healthRegistry.set("mockpsp", true)

        // MockPSP behaves deterministically for this test
        mockState.config.failureRate = 0.0
        mockState.config.addLatencyMs = 0
        mockState.config.forceTimeout = false

        val key = "containers-happy-1"

        val req = PaymentRequest(
            amount = 1000L,
            currency = "EUR",
            idempotencyKey = key
        )

        // Same request twice should return the same persisted payment
        val resp1 = paymentService.process(req)
        val resp2 = paymentService.process(req)

        Assertions.assertEquals(resp1.paymentId, resp2.paymentId)
        Assertions.assertEquals(resp1.status, resp2.status)
    }

    @Test
    fun `failover works when primary mockpsp times out`() {
        // Keep both providers UP so a secondary provider exists
        healthRegistry.set("stripe", true)
        healthRegistry.set("mockpsp", true)

        // Force MockPSP to throw to trigger failover behaviour
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

        // Expect Stripe to be used after MockPSP fails
        Assertions.assertEquals("stripe", resp.provider)
        Assertions.assertEquals("SUCCEEDED", resp.status)

        // Failover counter should have increased
        Assertions.assertTrue(metrics.failoverCount() >= 1L)
    }
}