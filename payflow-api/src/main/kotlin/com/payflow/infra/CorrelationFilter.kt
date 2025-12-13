package com.payflow.infra

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.MDC
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import java.util.*

@Component
class CorrelationFilter : OncePerRequestFilter() {
    override fun doFilterInternal(req: HttpServletRequest, res: HttpServletResponse, chain: FilterChain) {
        val cid = req.getHeader("X-Correlation-Id") ?: UUID.randomUUID().toString()
        MDC.put("cid", cid)
        res.setHeader("X-Correlation-Id", cid)
        try {
            chain.doFilter(req, res)
        } finally {
            MDC.remove("cid")
        }
    }
}