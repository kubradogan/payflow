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
        """
        SELECT p FROM Payment p
        WHERE (:status IS NULL OR p.status = :status)
          AND (
                :q IS NULL
             OR LOWER(p.idempotencyKey) LIKE LOWER(CONCAT('%', :q, '%'))
             OR LOWER(p.provider)        LIKE LOWER(CONCAT('%', :q, '%'))
          )
        ORDER BY p.createdAt DESC
        """
    )
    fun searchPayments(
        @Param("q") q: String?,
        @Param("status") status: String?,
        pageable: Pageable
    ): Page<Payment>

    fun findByIdempotencyKey(idempotencyKey: String): Payment?

}