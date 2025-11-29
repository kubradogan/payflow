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
        return undefined;   // public istek gibi gider, 401 alırsak FE’de yakalarız
    }

    return {Authorization: `Basic ${authToken}`};
}

export type PaymentItem = {
    id: string;
    amount: number;
    currency: string;
    status: string;
    provider: string;
    message?: string | null;
    createdAt: string;
};

export type AdminMetrics = {
    successRate: number;
    p95LatencyMs: number;
    failoverCount: number;
    errorDistribution: Record<string, number>;
};

export type ProvidersResponse = Record<string, boolean>;

export async function fetchPayments(): Promise<PaymentItem[]> {
    const res = await fetch(`${BASE_URL}/admin/payments`, {
        headers: authHeader(),
    });
    if (!res.ok) throw new Error("Failed to load payments");
    return res.json();
}

export async function fetchProviders(): Promise<ProvidersResponse> {
    const res = await fetch(`${BASE_URL}/admin/providers`, {
        headers: authHeader(),
    });
    if (!res.ok) {
        throw new Error("Failed to load providers");
    }
    return res.json();
}

export async function setProviderStatus(
    name: string,
    up: boolean
): Promise<void> {
    const status = up ? "up" : "down";
    const res = await fetch(`${BASE_URL}/admin/providers/${name}/${status}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(authHeader() ?? {}),
        },
    });
    if (!res.ok) {
        throw new Error("Failed to update provider");
    }
}

export async function fetchMetrics(): Promise<AdminMetrics> {
    const res = await fetch(`${BASE_URL}/admin/metrics`, {
        headers: authHeader(),
    });
    if (!res.ok) {
        throw new Error("Failed to load metrics");
    }
    return res.json();
}

export async function setMockFaultConfig(cfg: {
    failureRate: number;
    addLatencyMs: number;
    forceTimeout: boolean;
}): Promise<void> {
    const res = await fetch(`${BASE_URL}/admin/mockpsp/config`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(authHeader() ?? {}),
        },
        body: JSON.stringify(cfg),
    });
    if (!res.ok) {
        throw new Error("Failed to update mock config");
    }
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

export async function createPayment(
    req: CreatePaymentRequest
): Promise<PaymentItem> {
    const res = await fetch(`${BASE_URL}/payments`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...authHeader(),
        },
        body: JSON.stringify(req),
    });

    if (!res.ok) {
        throw new Error("Failed to create payment");
    }
    return res.json();
}

