package com.payflow.service

import com.payflow.api.PaymentListItem
import com.payflow.api.PaymentPageResponse
import com.payflow.api.PaymentRequest
import com.payflow.api.PaymentResponse
import com.payflow.core.EnhancedRouter
import com.payflow.core.MetricsRegistry
import com.payflow.domain.Payment
import com.payflow.domain.PaymentDecision
import com.payflow.infra.IdempotencyService
import com.payflow.provider.ProviderResult
import com.payflow.provider.PaymentsProvider
import com.payflow.repo.PaymentDecisionRepository
import com.payflow.repo.PaymentRepository
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry
import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID
import org.springframework.dao.DataIntegrityViolationException

@Service
class PaymentService(
    private val repo: PaymentRepository,
    private val router: EnhancedRouter,
    private val idem: IdempotencyService,
    private val metrics: MetricsRegistry,
    private val decisionRepo: PaymentDecisionRepository,
    private val circuitBreakerRegistry: CircuitBreakerRegistry
) {

    private val logger = LoggerFactory.getLogger(PaymentService::class.java)

    @Transactional
    fun process(req: PaymentRequest): PaymentResponse {
        val key = req.idempotencyKey

        // 1) Idempotent tekrar kontrolü
        repo.findByIdempotencyKey(key)?.let { existing ->
            return PaymentResponse.from(
                id = existing.id,
                status = existing.status,
                provider = existing.provider,
                message = existing.message
            )
        }

        // 2) Idempotency kilidi (Redis)
        if (!idem.tryAcquire(key, "processing")) {
            val existing = repo.findByIdempotencyKey(key)
                ?: throw IllegalStateException("Idempotent request in progress, please retry")
            return PaymentResponse.from(existing.id, existing.status, existing.provider, existing.message)
        }

        // 3) Primary provider seçimi
        val primary = router.chooseProvider()
        logger.info("Chosen PRIMARY provider={} for idempotencyKey={}", primary.providerName, key)

        var p = Payment(
            amount = req.amount,
            currency = req.currency,
            idempotencyKey = key,
            provider = primary.providerName,
            status = "PENDING"
        )
        try {
            p = repo.save(p)
        } catch (ex: DataIntegrityViolationException) {
            // Aynı idempotencyKey ile başka thread/process bizden önce insert ettiyse
            val existing = repo.findByIdempotencyKey(key) ?: throw ex
            return PaymentResponse.from(existing.id, existing.status, existing.provider, existing.message)
        }

        // Primary routing kararı için audit kaydı
        decisionRepo.save(
            PaymentDecision(
                paymentId = p.id,
                chosenProvider = primary.providerName,
                reason = primary.reason
            )
        )

        val result: ProviderResult

        try {
            // 4) Primary denemesi (Resilience4j circuit breaker ile)
            val start = System.nanoTime()
            result = callProviderWithCircuitBreaker(
                primary.providerName,
                primary.provider,
                req.amount,
                req.currency,
                key
            )
            val latencyMs = (System.nanoTime() - start) / 1_000_000
            router.report(primary.providerName, result.success, latencyMs)

            if (!result.success) {
                // Provider decline hata metriği
                metrics.recordError("primary-decline")
            }
        } catch (ex: Exception) {
            // Primary çağrısı sırasında exception oluştu
            metrics.recordError("primary-exception")
            router.report(primary.providerName, false, 5_000)

            val secondary = router.chooseProviderExcluding(primary.providerName)
            if (secondary.providerName != primary.providerName) {
                // Başka UP provider var → failover
                metrics.incFailover()

                decisionRepo.save(
                    PaymentDecision(
                        paymentId = p.id,
                        chosenProvider = secondary.providerName,
                        reason = "failover:${secondary.reason}"
                    )
                )

                val failoverStart = System.nanoTime()
                val r2 = callProviderWithCircuitBreaker(
                    secondary.providerName,
                    secondary.provider,
                    req.amount,
                    req.currency,
                    key
                )
                val failoverMs = (System.nanoTime() - failoverStart) / 1_000_000

                router.report(secondary.providerName, r2.success, failoverMs)

                if (!r2.success) {
                    metrics.recordError("secondary-decline")
                }

                p.provider = secondary.providerName
                p.status = if (r2.success) "SUCCEEDED" else "FAILED"
                p.message = r2.message
                p = repo.save(p)

                idem.setResult(key, p.id.toString())

                logger.info(
                    "Failover completed to provider={} in {} ms (paymentId={}, idempotencyKey={})",
                    secondary.providerName,
                    failoverMs,
                    p.id,
                    key
                )

                return PaymentResponse.from(p.id, p.status, p.provider, p.message)
            } else {
                // Başka UP provider yok → primary fail + NO FAILOVER metriği
                metrics.recordError("primary-decline-no-failover")

                p.status = "FAILED"
                p.message = "Primary provider (${primary.providerName}) failed: ${ex.message}"
                p = repo.save(p)
                idem.setResult(key, p.id.toString())

                return PaymentResponse.from(p.id, p.status, p.provider, p.message)
            }
        }

        // 5) Primary path başarılı veya decline (exception OLMADAN)
        p.status = if (result.success) "SUCCEEDED" else "FAILED"
        p.message = result.message
        p = repo.save(p)

        if (!result.success) {
            // Buraya ancak: exception yok, failover yok, provider success=false ise geliyoruz
            metrics.recordError("primary-decline-no-failover")
        }

        idem.setResult(key, p.id.toString())

        return PaymentResponse.from(p.id, p.status, p.provider, p.message)
    }

    fun get(id: String): PaymentResponse {
        val entity = repo.findById(UUID.fromString(id)).orElseThrow()
        return PaymentResponse.from(entity.id, entity.status, entity.provider, entity.message)
    }

    fun searchPayments(
        query: String?,
        status: String?,
        page: Int,
        size: Int
    ): PaymentPageResponse {
        val effectiveQuery = query?.takeIf { it.isNotBlank() }
        val effectiveStatus = status?.takeIf { it.isNotBlank() && it != "ALL" }

        val pageable = PageRequest.of(page, size)
        val resultPage = repo.searchPayments(effectiveQuery, effectiveStatus, pageable)

        val items = resultPage.content.map {
            PaymentListItem(
                id = it.id,
                amount = it.amount,
                currency = it.currency,
                status = it.status,
                provider = it.provider,
                message = it.message,
                createdAt = it.createdAt,
                idempotencyKey = it.idempotencyKey
            )
        }

        return PaymentPageResponse(
            items = items,
            page = resultPage.number,
            size = resultPage.size,
            total = resultPage.totalElements
        )
    }

    private fun callProviderWithCircuitBreaker(
        providerName: String,
        provider: PaymentsProvider,
        amount: Long,
        currency: String,
        idempotencyKey: String
    ): ProviderResult {
        val cb = circuitBreakerRegistry.circuitBreaker(providerName)
        return cb.executeSupplier {
            provider.charge(amount, currency, idempotencyKey)
        }
    }
}