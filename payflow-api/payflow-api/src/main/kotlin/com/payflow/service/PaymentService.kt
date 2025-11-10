package com.payflow.service

import com.payflow.api.PaymentRequest
import com.payflow.api.PaymentResponse
import com.payflow.core.EnhancedRouter
import com.payflow.domain.Payment
import com.payflow.infra.IdempotencyService
import com.payflow.provider.ProviderResult
import com.payflow.repo.PaymentRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class PaymentService(
    private val repo: PaymentRepository,
    private val router: EnhancedRouter,
    private val idem: IdempotencyService
) {

    @Transactional
    fun process(req: PaymentRequest): PaymentResponse {
        val key = req.idempotencyKey

        repo.findByIdempotencyKey(key)?.let { existing ->
            return PaymentResponse.from(
                id = existing.id,
                status = existing.status,
                provider = existing.provider,
                message = existing.message
            )
        }

        if (!idem.tryAcquire(key, "processing")) {
            val existing = repo.findByIdempotencyKey(key)
                ?: throw IllegalStateException("Idempotent request in progress, please retry")
            return PaymentResponse.from(existing.id, existing.status, existing.provider, existing.message)
        }

        val primary = router.chooseProvider()
        var p = Payment(
            amount = req.amount,
            currency = req.currency,
            idempotencyKey = key,
            provider = primary.providerName, // "stripe" / "mockpsp"
            status = "PENDING"
        )
        p = repo.save(p)

        var used = primary
        val result: ProviderResult

        try {
            val start = System.nanoTime()
            result = primary.provider.charge(req.amount, req.currency, key)
            val latencyMs = (System.nanoTime() - start) / 1_000_000
            router.report(primary.providerName, result.success, latencyMs)
        } catch (ex: Exception) {
            // Failover
            val secondary = router.chooseProvider()
            if (secondary.providerName != primary.providerName) {
                used = secondary
                val s2 = System.nanoTime()
                val r2 = secondary.provider.charge(req.amount, req.currency, key)
                val l2 = (System.nanoTime() - s2) / 1_000_000
                router.report(secondary.providerName, r2.success, l2)
                p.provider = secondary.providerName
                // update status/message aşağıda r2 ile yapılacak
                p.status = if (r2.success) "SUCCEEDED" else "FAILED"
                p.message = r2.message
                p = repo.save(p)
                idem.setResult(key, p.id.toString())
                return PaymentResponse.from(p.id, p.status, p.provider, p.message)
            } else {
                throw ex
            }
        }

        p.status = if (result.success) "SUCCEEDED" else "FAILED"
        p.message = result.message
        p = repo.save(p)

        idem.setResult(key, p.id.toString())

        return PaymentResponse.from(p.id, p.status, p.provider, p.message)
    }

    fun get(id: String): PaymentResponse {
        val entity = repo.findById(UUID.fromString(id)).orElseThrow()
        return PaymentResponse.from(entity.id, entity.status, entity.provider, entity.message)
    }
}