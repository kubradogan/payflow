package com.payflow.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.OffsetDateTime
import java.util.UUID

@Entity
@Table(name = "payment_decisions")
class PaymentDecision(

    // Unique identifier for each routing decision record
    @Id
    var id: UUID = UUID.randomUUID(),

    // Reference to the related payment
    @Column(nullable = false)
    var paymentId: UUID,

    // Provider selected by the routing logic
    @Column(nullable = false)
    var chosenProvider: String,

    // Explanation of why this provider was chosen
    @Column(nullable = false)
    var reason: String,

    // Timestamp of when the routing decision was made
    @Column(nullable = false)
    var decidedAt: OffsetDateTime = OffsetDateTime.now()
)