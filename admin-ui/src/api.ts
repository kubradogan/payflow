const BASE_URL = "http://localhost:8080";

// Global Basic Auth token (Base64)
let authToken: string | null = null;

export function setCredentials(username: string, password: string) {
    authToken = btoa(`${username}:${password}`);
    localStorage.setItem("authToken", authToken);
}

// Headers üretici
function authHeader(): HeadersInit | undefined {
    // Token yoksa localStorage’dan yüklemeyi dene
    if (!authToken) {
        const stored = localStorage.getItem("authToken");
        if (stored) {
            authToken = stored;
        }
    }

    if (!authToken) {
        return undefined;// public istek gibi gider401 alırsak FEde yakalar
    }

    return {Authorization: `Basic ${authToken}`};
}

// Ortak fetch helper
async function doFetch(url: string, init: RequestInit = {}): Promise<Response> {
    const res = await fetch(url, {
        ...init,
        headers: {
            ...(init.headers || {}),
            ...(authHeader() ?? {}),
        },
    });

    if (res.status === 401) {
        // Token bozuk / süresi dolmuş tamamen logout ol
        clearCredentials();
        //sayfayı yenile, App state'i baştan LoginView'e düşecek
        window.location.reload();
        throw new Error("Unauthorized");
    }

    return res;
}

async function handleJson<T>(res: Response): Promise<T> {
    if (res.status === 401) {
        // Auth bitmiş, temizle ve login ekranına dön
        clearCredentials();
        // basit çözüm: sayfayı login’e döndür
        window.location.href = "/";
        throw new Error("Unauthorized");
    }

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Request failed");
    }

    return res.json() as Promise<T>;
}

export type PaymentsQuery = {
    page?: number;
    size?: number;
    query?: string;
    status?: string; //SUCCEEDED FAILED PENDING
};


export type PaymentItem = {
    id: string;
    amount: number;
    currency: string;
    status: string;
    provider: string;
    message?: string | null;
    createdAt: string;
    idempotencyKey: string;
};

export type PaymentPage = {
    items: PaymentItem[];
    page: number;
    size: number;
    total: number;
};

export type AdminMetrics = {
    successRate: number;
    p95LatencyMs: number;
    failoverCount: number;
    errorDistribution: Record<string, number>;
};

export type ProvidersResponse = Record<string, boolean>;

export async function fetchPayments(
    params: PaymentsQuery = {}
): Promise<PaymentPage> {
    const search = new URLSearchParams();

    if (params.page !== undefined) search.append("page", String(params.page));
    if (params.size !== undefined) search.append("size", String(params.size));
    if (params.query && params.query.trim() !== "") {
        search.append("query", params.query.trim());
    }
    if (params.status && params.status !== "ALL") {
        search.append("status", params.status);
    }

    const qs = search.toString();
    const url = qs
        ? `${BASE_URL}/admin/payments?${qs}`
        : `${BASE_URL}/admin/payments`;

    const res = await doFetch(url);
    return handleJson<PaymentPage>(res);
}

export async function fetchProviders(): Promise<ProvidersResponse> {
    const res = await doFetch(`${BASE_URL}/admin/providers`);
    return handleJson<ProvidersResponse>(res);
}

export async function setProviderStatus(
    name: string,
    up: boolean
): Promise<void> {
    const status = up ? "up" : "down";
    const res = await doFetch(`${BASE_URL}/admin/providers/${name}/${status}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    });
    await handleJson<any>(res);   // body önemli değil
}

export async function fetchMetrics(): Promise<AdminMetrics> {
    const res = await doFetch(`${BASE_URL}/admin/metrics`);
    return handleJson<AdminMetrics>(res);
}

export async function setMockFaultConfig(cfg: {
    failureRate: number;
    addLatencyMs: number;
    forceTimeout: boolean;
}): Promise<void> {
    const res = await doFetch(`${BASE_URL}/admin/mockpsp/config`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(cfg),
    });
    await handleJson<any>(res);
}

// Logout için
export function clearCredentials() {
    authToken = null;
    localStorage.removeItem("authToken");
}

// Uygulama açıldığında önceden login var mı kontrolü
export function hasAuthToken(): boolean {
    if (authToken) return true;
    const stored = localStorage.getItem("authToken");
    if (stored) {
        authToken = stored;
        return true;
    }
    return false;
}

// Yeni ödeme oluşturmak için
export type CreatePaymentRequest = {
    amount: number;
    currency: string;
    idempotencyKey: string;
};
export type PaymentResponse = {
    paymentId: string;
    status: string;
    provider: string | null;
    message: string | null;
};

export type CreatePaymentResult = {
    payment: PaymentResponse;
    correlationId: string | null;
};

export async function createPayment(
    req: CreatePaymentRequest
): Promise<CreatePaymentResult> {
    // İsteğe client-side correlation id üret
    const cid = crypto.randomUUID();

    const res = await fetch(`${BASE_URL}/payments`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Correlation-Id": cid,
            ...(authHeader() ?? {}),
        },
        body: JSON.stringify(req),
    });

    const body: PaymentResponse = await res.json();

    if (!res.ok) {
        // backend hata mesajı varsa yine de fırlat
        throw new Error(body.message || "Failed to create payment");
    }

    // Backend döndürdüyse onu kullan, yoksa kendi ürettiğimizi
    const respCid = res.headers.get("X-Correlation-Id");

    return {
        payment: body,
        correlationId: respCid || cid,
    };
}

export type PaymentDecision = {
    chosenProvider: string;
    reason: string;
    decidedAt: string;
};

export async function fetchPaymentDecisions(
    paymentId: string
): Promise<PaymentDecision[]> {
    const res = await fetch(
        `${BASE_URL}/admin/payments/${paymentId}/decisions`,
        {
            headers: authHeader(),
        }
    );

    if (!res.ok) {
        throw new Error("Failed to load routing decisions");
    }
    return res.json();
}
