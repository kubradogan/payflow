package com.payflow.web

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.nio.charset.StandardCharsets
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

@RestController
@RequestMapping("/webhooks")
class WebhookController(

    // Shared secret used to validate incoming webhook signatures
    @Value("\${payflow.webhook.stripe.secret:dev-webhook-secret}")
    private val webhookSecret: String
) {

    private val logger = LoggerFactory.getLogger(WebhookController::class.java)

    // Receives webhook calls and validates the HMAC signature
    @PostMapping("/stripe")
    fun handleStripeWebhook(
        @RequestHeader(name = "X-Signature", required = false) signature: String?,
        @RequestBody body: String
    ): ResponseEntity<Void> {

        // Reject requests without a signature header
        if (signature.isNullOrBlank()) {
            logger.warn("Webhook request received without signature header")
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
        }

        val expectedSignature = computeHmac(body, webhookSecret)

        return if (constantTimeEquals(expectedSignature, signature)) {
            // In a real system, domain-specific event handling would occur here
            logger.info("Valid webhook received, payloadSize={}", body.length)
            ResponseEntity.ok().build()
        } else {
            logger.warn("Webhook signature validation failed")
            ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        }
    }

    // Generates HMACSHA256 signature for the request body
    private fun computeHmac(body: String, secret: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        val keySpec = SecretKeySpec(secret.toByteArray(StandardCharsets.UTF_8), "HmacSHA256")
        mac.init(keySpec)
        val bytes = mac.doFinal(body.toByteArray(StandardCharsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }

    // Compares two strings in constant time to avoid timing attacks
    private fun constantTimeEquals(a: String, b: String): Boolean {
        if (a.length != b.length) return false
        var result = 0
        for (i in a.indices) {
            result = result or (a[i].code xor b[i].code)
        }
        return result == 0
    }
}