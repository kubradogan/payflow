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

@SpringBootTest
@AutoConfigureMockMvc
class SecurityAndWebhookTests : TestContainersConfig() {

    @Autowired lateinit var mvc: MockMvc

    // ---- ADMIN AUTH ----

    @Test
    fun `admin endpoints require auth`() {
        mvc.get("/admin/metrics")
            .andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `admin endpoints work with basic auth`() {
        mvc.get("/admin/metrics") {
            header("Authorization", basic("admin", "admin123"))
        }.andExpect { status { isOk() } }
    }

    // ---- PAYMENTS VALIDATION ----

    @Test
    fun `payments request validation rejects invalid input`() {
        val body = """{"amount":0,"currency":"EUR","idempotencyKey":""}"""
        mvc.post("/payments") {
            contentType = MediaType.APPLICATION_JSON
            content = body
        }.andExpect { status { isBadRequest() } }
    }

    // ---- WEBHOOK HMAC ----

    @Test
    fun `webhook missing signature returns 400`() {
        mvc.post("/webhooks/stripe") {
            contentType = MediaType.TEXT_PLAIN
            content = "hello"
        }.andExpect { status { isBadRequest() } }
    }

    @Test
    fun `webhook invalid signature returns 401`() {
        mvc.post("/webhooks/stripe") {
            contentType = MediaType.TEXT_PLAIN
            content = "hello"
            header("X-Signature", "deadbeef")
        }.andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `webhook valid signature returns 200`() {
        val body = "hello"
        val secret = "dev-webhook-secret" // application.yml’deki default ile aynı
        val sig = hmacSha256Hex(body, secret)

        mvc.post("/webhooks/stripe") {
            contentType = MediaType.TEXT_PLAIN
            content = body
            header("X-Signature", sig)
        }.andExpect { status { isOk() } }
    }

    private fun basic(u: String, p: String): String {
        val token = java.util.Base64.getEncoder()
            .encodeToString("$u:$p".toByteArray(StandardCharsets.UTF_8))
        return "Basic $token"
    }

    private fun hmacSha256Hex(body: String, secret: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret.toByteArray(StandardCharsets.UTF_8), "HmacSHA256"))
        return mac.doFinal(body.toByteArray(StandardCharsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
    }
}