import http from 'k6/http';
import {check} from 'k6';

export const options = {
    vus: 10,          // aynı anda 10 sanal kullanıcı
    duration: '30s',  // 30 saniye boyunca yük
};

export default function () {
    const idem = `k6-${__VU}-${__ITER}`; // her istek için benzersiz idempotencyKey

    const payload = JSON.stringify({
        amount: 100,
        currency: 'EUR',
        idempotencyKey: idem,
    });

    const res = http.post('http://localhost:8080/payments', payload, {
        headers: {
            'Content-Type': 'application/json',
        },
    });

    check(res, {
        'status is 200': (r) => r.status === 200,
    });
}