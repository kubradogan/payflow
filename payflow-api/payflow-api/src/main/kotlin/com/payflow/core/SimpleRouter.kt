package com.payflow.core

import org.springframework.stereotype.Component

enum class Provider { STRIPE, MOCKPSP }

@Component
class SimpleRouter {
    fun chooseProvider(): Provider = Provider.STRIPE
}