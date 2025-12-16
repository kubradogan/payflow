package com.payflow

import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.containers.GenericContainer
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers

@Testcontainers
abstract class TestContainersConfig {

    companion object {

        @Container
        @JvmStatic
        val postgres: PostgreSQLContainer<Nothing> =
            PostgreSQLContainer<Nothing>("postgres:16-alpine").apply {
                // Isolated PostgreSQL instance for integration tests
                withDatabaseName("payflow_test")
                withUsername("payflow")
                withPassword("payflow")
            }

        @Container
        @JvmStatic
        val redis: GenericContainer<Nothing> =
            GenericContainer<Nothing>("redis:7-alpine").apply {
                // Lightweight Redis container for idempotency and cache tests
                withExposedPorts(6379)
            }

        @JvmStatic
        @DynamicPropertySource
        fun registerProps(registry: DynamicPropertyRegistry) {
            // Override datasource properties with Testcontainers values
            registry.add("spring.datasource.url") { postgres.jdbcUrl }
            registry.add("spring.datasource.username") { postgres.username }
            registry.add("spring.datasource.password") { postgres.password }

            // Override Redis connection for tests
            registry.add("spring.data.redis.host") { redis.host }
            registry.add("spring.data.redis.port") { redis.getMappedPort(6379) }

            // Enables automatic schema creation for faster test execution
            registry.add("spring.jpa.hibernate.ddl-auto") { "update" }
        }
    }
}