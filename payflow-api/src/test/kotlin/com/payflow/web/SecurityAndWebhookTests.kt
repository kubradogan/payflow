package com.payflow.web

import com.payflow.TestContainersConfig
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.get
import java.nio.charset.StandardCharsets
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

// Securityfocused tests for admin auth rules and request validation and webhook HMAC verification
@SpringBootTest
@AutoConfigureMockMvc
class SecurityAndWebhookTests : TestContainersConfig() {

    // MockMvc allows testing HTTP layer behaviour without a running frontend
    @Autowired
    lateinit var mvc: MockMvc

    // ADMIN AUTH 

    @Test
    fun `admin endpoints require auth`() {
        // /admin/** should be protected by Basic Auth
        mvc.get("/admin/metrics")
            .andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `admin endpoints work with basic auth`() {
        // Valid credentials should allow access to admin endpoints
        mvc.get("/admin/metrics") {
            header("Authorization", basic("admin", "admin123"))
        }.andExpect { status { isOk() } }
    }

    // PAYMENTS VALIDATION 

    @Test
    fun `payments request validation rejects invalid input`() {
        // amount must be >= 1 and idempotencyKey must be non-blank
        val body = """{"amount":0,"currency":"EUR","idempotencyKey":""}"""
        mvc.post("/payments") {
            contentType = MediaType.APPLICATION_JSON
            content = body
        }.andExpect { status { isBadRequest() } }
    }

    // WEBHOOK HMAC 

    @Test
    fun `webhook missing signature returns 400`() {
        // Missing XSignature header should be treated as a bad request
        mvc.post("/webhooks/stripe") {
            contentType = MediaType.TEXT_PLAIN
            content = "hello"
        }.andExpect { status { isBadRequest() } }
    }

    @Test
    fun `webhook invalid signature returns 401`() {
        // Invalid signature should be rejected as unauthorized
        mvc.post("/webhooks/stripe") {
            contentType = MediaType.TEXT_PLAIN
            content = "hello"
            header("X-Signature", "deadbeef")
        }.andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `webhook valid signature returns 200`() {
        // Compute the expected signature and verify the endpoint accepts it
        val body = "hello"
        val secret = "dev-webhook-secret" // Same default secret as application.yml
        val sig = hmacSha256Hex(body, secret)

        mvc.post("/webhooks/stripe") {
            contentType = MediaType.TEXT_PLAIN
            content = body
            header("X-Signature", sig)
        }.andExpect { status { isOk() } }
    }

    // Builds an Authorization header value for HTTP Basic Auth
    private fun basic(u: String, p: String): String {
        val token = java.util.Base64.getEncoder()
            .encodeToString("$u:$p".toByteArray(StandardCharsets.UTF_8))
        return "Basic $token"
    }

    // Returns hex(HMACSHA256(body and secret)) to match the webhook verification logic
    private fun hmacSha256Hex(body: String, secret: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret.toByteArray(StandardCharsets.UTF_8), "HmacSHA256"))
        return mac.doFinal(body.toByteArray(StandardCharsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
    }
}