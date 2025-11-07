package com.payflow.domain

import jakarta.persistence.*
import java.time.OffsetDateTime
import java.util.*

@Entity
@Table(
    name = "payments",
    uniqueConstraints = [UniqueConstraint(name = "uk_idempotency_key", columnNames = ["idempotency_key"])]
)
class Payment(
    @Id
    var id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var amount: Long,

    @Column(nullable = false)
    var currency: String,

    @Column(nullable = false)
    var status: String = "PENDING",           // PENDING | SUCCEEDED | FAILED

    @Column(nullable = false, unique = true)
    var idempotencyKey: String,

    @Column(nullable = false)
    var provider: String = "unassigned",

    @Column
    var message: String? = null,

    @Column(nullable = false)
    var createdAt: OffsetDateTime = OffsetDateTime.now(),
)