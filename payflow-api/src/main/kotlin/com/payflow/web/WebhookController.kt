package com.payflow.web

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.nio.charset.StandardCharsets
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * Minimal HMAC-signed webhook endpoint skeleton.
 *
 * - Exposes POST /webhooks/stripe
 * - Expects an X-Signature header with hex(HMAC-SHA256(body, secret))
 * - Verifies the signature and returns:
 *      200 OK when valid
 *      400 Bad Request when header is missing
 *      401 Unauthorized when signature does not match
 *
 * NOTE: This is a generic HMAC example, not a full Stripe event parser.
 *       It is enough to demonstrate the security pattern promised in the proposal.
 */
@RestController
@RequestMapping("/webhooks")
class WebhookController(

    @Value("\${payflow.webhook.stripe.secret:dev-webhook-secret}")
    private val webhookSecret: String
) {

    private val logger = LoggerFactory.getLogger(WebhookController::class.java)

    @PostMapping("/stripe")
    fun handleStripeWebhook(
        @RequestHeader(name = "X-Signature", required = false) signature: String?,
        @RequestBody body: String
    ): ResponseEntity<Void> {

        if (signature.isNullOrBlank()) {
            logger.warn("Webhook called without X-Signature header")
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
        }

        val expected = computeHmac(body, webhookSecret)

        return if (constantTimeEquals(expected, signature)) {
            // Burada normalde event tipine göre domain işlemleri yapılır.
            logger.info("Valid HMAC webhook received (len={}, signature={})", body.length, signature.take(16))
            ResponseEntity.ok().build()
        } else {
            logger.warn("Invalid webhook signature: expected={}, actual={}", expected, signature.take(64))
            ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        }
    }

    /**
     * Computes hex(HMAC-SHA256(body, secret))
     */
    private fun computeHmac(body: String, secret: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        val keySpec = SecretKeySpec(secret.toByteArray(StandardCharsets.UTF_8), "HmacSHA256")
        mac.init(keySpec)
        val bytes = mac.doFinal(body.toByteArray(StandardCharsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }

    /**
     * Constant-time string comparison to avoid timing side-channels.
     */
    private fun constantTimeEquals(a: String, b: String): Boolean {
        if (a.length != b.length) return false
        var result = 0
        for (i in a.indices) {
            result = result or (a[i].code xor b[i].code)
        }
        return result == 0
    }
}