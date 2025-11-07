package com.payflow

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class PayflowApiApplication

fun main(args: Array<String>) {
	runApplication<PayflowApiApplication>(*args)
}
