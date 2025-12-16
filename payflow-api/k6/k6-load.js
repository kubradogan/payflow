import http from 'k6/http';
import {check} from 'k6';

// Base URL is read from environment variables to allow flexibility
// between local and containerised environments
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// Load test configuration
// The goal is not stress testing, but observing stable behaviour
// under a small, controlled concurrent load
export const options = {
    vus: 10,               // Number of virtual users
    duration: '30s',       // Test duration
    thresholds: {
        // Basic SLA-style thresholds for the demo environment
        http_req_duration: ['p(95)<200'],
        http_req_failed: ['rate<0.05'],
    },
};

export default function () {

    // Generate a unique idempotency key per virtual user and iteration
    // This ensures that each request represents a distinct logical payment
    const idem = `k6-${__VU}-${__ITER}`;

    const payload = JSON.stringify({
        amount: 100,            // Amount in cents (100 = 1.00 EUR)
        currency: 'EUR',
        idempotencyKey: idem,
    });

    const headers = {
        'Content-Type': 'application/json',

        // The correlation ID matches the idempotency key
        // This makes it easier to trace requests in application logs
        'X-Correlation-Id': idem,
    };

    const res = http.post(`${BASE_URL}/payments`, payload, {headers});

    // Basic response validation to confirm correct behaviour
    check(res, {
        'status is 200': (r) => r.status === 200,
        'has paymentId': (r) => !!r.json('paymentId'),
    });
}