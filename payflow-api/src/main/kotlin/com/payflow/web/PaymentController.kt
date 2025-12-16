package com.payflow.web

import com.payflow.api.PaymentRequest
import com.payflow.api.PaymentResponse
import com.payflow.service.PaymentService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/payments")
class PaymentController(
    private val service: PaymentService
) {
    // Accepts a new payment request and delegates processing to the service layer
    @PostMapping
    fun create(@Valid @RequestBody req: PaymentRequest): ResponseEntity<PaymentResponse> =
        ResponseEntity.ok(service.process(req))

    // Retrieves an existing payment by its unique identifier
    @GetMapping("/{id}")
    fun get(@PathVariable id: String): ResponseEntity<PaymentResponse> =
        ResponseEntity.ok(service.get(id))
}