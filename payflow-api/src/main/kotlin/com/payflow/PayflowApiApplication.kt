package com.payflow

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

// Main Spring Boot entry point for the PayFlow backend application
@SpringBootApplication
class PayflowApiApplication

fun main(args: Array<String>) {
    // Boots the Spring application context and starts the embedded server
    runApplication<PayflowApiApplication>(*args)
}