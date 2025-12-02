import http from 'k6/http';
import {check} from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export const options = {
    vus: 10,
    duration: '30s',
    thresholds: {
        http_req_duration: ['p(95)<200'],
        http_req_failed: ['rate<0.05'],
    },
};

export default function () {
    // Her sanal kullanıcı + iterasyon için benzersiz idempotency key
    const idem = `k6-${__VU}-${__ITER}`;

    const payload = JSON.stringify({
        amount: 100,           // 100 cent = 1.00
        currency: 'EUR',
        idempotencyKey: idem,
    });

    const headers = {
        'Content-Type': 'application/json',
        // Correlation ID’yi de log’larda görmek için aynı değeri kullanıyoruz
        'X-Correlation-Id': idem,
    };

    const res = http.post(`${BASE_URL}/payments`, payload, {headers});

    check(res, {
        'status is 200': (r) => r.status === 200,
        'has paymentId': (r) => !!r.json('paymentId'),
    });
}