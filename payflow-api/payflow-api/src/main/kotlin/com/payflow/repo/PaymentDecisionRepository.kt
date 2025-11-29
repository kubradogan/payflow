package com.payflow.repo

import com.payflow.domain.PaymentDecision
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface PaymentDecisionRepository : JpaRepository<PaymentDecision, UUID> {
    fun findByPaymentId(paymentId: UUID): List<PaymentDecision>
}