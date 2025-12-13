package com.payflow.repo

import com.payflow.domain.Payment
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface PaymentRepository : JpaRepository<Payment, UUID> {

    @Query(
        value = """
        SELECT * FROM payments
        WHERE (:status IS NULL OR status = :status)
          AND (
                :q IS NULL
             OR idempotency_key ILIKE CONCAT('%', :q, '%')
             OR provider ILIKE CONCAT('%', :q, '%')
          )
        ORDER BY created_at DESC
    """,
        countQuery = """
        SELECT count(*) FROM payments
        WHERE (:status IS NULL OR status = :status)
          AND (
                :q IS NULL
             OR idempotency_key ILIKE CONCAT('%', :q, '%')
             OR provider ILIKE CONCAT('%', :q, '%')
          )
    """,
        nativeQuery = true
    )
    fun searchPayments(
        @Param("q") q: String?,
        @Param("status") status: String?,
        pageable: Pageable
    ): Page<Payment>

    fun findByIdempotencyKey(idempotencyKey: String): Payment?

}