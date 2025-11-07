package com.payflow.service

import com.payflow.api.PaymentRequest
import com.payflow.api.PaymentResponse
import com.payflow.core.Provider
import com.payflow.core.SimpleRouter
import com.payflow.domain.Payment
import com.payflow.provider.MockPspProvider
import com.payflow.provider.PaymentsProvider
import com.payflow.provider.StripeStubProvider
import com.payflow.repo.PaymentRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class PaymentService(
    private val repo: PaymentRepository,
    private val router: SimpleRouter,
    private val stripe: StripeStubProvider,
    private val mock: MockPspProvider
) {

    @Transactional
    fun process(req: PaymentRequest): PaymentResponse {

        val chosen = router.chooseProvider()

        var p = Payment(
            amount = req.amount,
            currency = req.currency,
            idempotencyKey = req.idempotencyKey,
            provider = chosen.name.lowercase(),
            status = "PENDING"
        )
        p = repo.save(p)
        val result = when (chosen) {
            Provider.STRIPE  -> stripe.charge(req.amount, req.currency, req.idempotencyKey)
            Provider.MOCKPSP -> mock.charge(req.amount, req.currency, req.idempotencyKey)
        }

        p.status = if (result.success) "SUCCEEDED" else "FAILED"
        p.message = result.message
        p = repo.save(p)

        return PaymentResponse.from(
            id = p.id,
            status = p.status,
            provider = p.provider,
            message = p.message
        )
    }

    fun get(id: String): PaymentResponse {
        val entity = repo.findById(UUID.fromString(id)).orElseThrow()
        return PaymentResponse.from(entity.id, entity.status, entity.provider, entity.message)
    }
}