package com.payflow.repo

import com.payflow.domain.PaymentDecision
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface PaymentDecisionRepository : JpaRepository<PaymentDecision, UUID> {

    // Returns routing decisions for a payment ordered by decision time
    fun findByPaymentIdOrderByDecidedAtAsc(paymentId: UUID): List<PaymentDecision>
}