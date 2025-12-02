package com.payflow.repo

import com.payflow.domain.PaymentDecision
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface PaymentDecisionRepository : JpaRepository<PaymentDecision, UUID> {

    // Routing history'yi decidedAt artan sırada al
    fun findByPaymentIdOrderByDecidedAtAsc(paymentId: UUID): List<PaymentDecision>
}