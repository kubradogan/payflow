package com.payflow.api

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import java.time.OffsetDateTime
import java.util.*

/*
 * Request model used when creating a new payment.
 * Basic validation is applied at the API level.
 */
data class PaymentRequest(
    // Amount in minor units (cents) must be greater than zero
    @field:Min(1) val amount: Long,

    // Currency code, defaulted for demo simplicity
    @field:NotBlank val currency: String = "EUR",

    // Ensures the same request is not processed more than once
    @field:NotBlank val idempotencyKey: String
)

/*
 * Response returned to the client after payment processing.
 */
data class PaymentResponse(
    val paymentId: String,
    val status: String,
    val provider: String?,
    val message: String?
) {
    companion object {
        // Simple factory method to map internal values to an API response
        fun from(
            id: java.util.UUID,
            status: String,
            provider: String?,
            message: String?
        ) = PaymentResponse(
            paymentId = id.toString(),
            status = status,
            provider = provider,
            message = message
        )
    }
}

/*
 * Lightweight projection used for admin payment listings.
 */
data class PaymentListItem(
    val id: UUID,
    val amount: Long,
    val currency: String,
    val status: String,
    val provider: String,
    val message: String?,
    val createdAt: OffsetDateTime,
    val idempotencyKey: String
)

/*
 * Wrapper for paginated payment results in the admin UI.
 */
data class PaymentPageResponse(
    val items: List<PaymentListItem>,
    val page: Int,
    val size: Int,
    val total: Long
)

/*
 * Exposes routing decisions made during payment processing.
 */
data class PaymentDecisionDto(
    val chosenProvider: String,
    val reason: String,
    val decidedAt: OffsetDateTime
)