package com.payflow.repo

import com.payflow.domain.Payment
import org.springframework.data.jpa.repository.JpaRepository
import java.util.*

interface PaymentRepository : JpaRepository<Payment, UUID> {
    fun findByIdempotencyKey(idempotencyKey: String): Payment?
}