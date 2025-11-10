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
    @Id var id: UUID = UUID.randomUUID(),
    @Column(nullable = false) var paymentId: UUID,
    @Column(nullable = false) var chosenProvider: String,
    @Column(nullable = false) var reason: String,
    @Column(nullable = false) var decidedAt: OffsetDateTime = OffsetDateTime.now()
)