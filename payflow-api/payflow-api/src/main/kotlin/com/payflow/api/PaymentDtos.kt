package com.payflow.api

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import java.time.OffsetDateTime
import java.util.*

data class PaymentRequest(
    @field:Min(1) val amount: Long,
    @field:NotBlank val currency: String = "EUR",
    @field:NotBlank val idempotencyKey: String
)

data class PaymentResponse(
    val paymentId: String,
    val status: String,
    val provider: String?,
    val message: String?
) {
    companion object {
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

data class PaymentPageResponse(
    val items: List<PaymentListItem>,
    val page: Int,
    val size: Int,
    val total: Long
)