// src/api.ts
const BASE_URL = "http://localhost:8080";

const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";

function authHeader() {
    const token = btoa(`${ADMIN_USER}:${ADMIN_PASS}`);
    return { Authorization: `Basic ${token}` };
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

// /admin/providers şu an Map<String, Boolean> dönüyor
export type ProvidersResponse = Record<string, boolean>;

export async function fetchPayments(): Promise<PaymentItem[]> {
    const res = await fetch(`${BASE_URL}/admin/payments`, {
        headers: {
            ...authHeader(),
        },
    });
    if (!res.ok) throw new Error("Failed to load payments");
    return res.json();
}

export async function fetchProviders(): Promise<ProvidersResponse> {
    const res = await fetch(`${BASE_URL}/admin/providers`, {
        headers: {
            ...authHeader(),
        },
    });
    if (!res.ok) throw new Error("Failed to load providers");
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
            ...authHeader(),
        },
    });
    if (!res.ok) throw new Error("Failed to update provider");
}

export async function fetchMetrics(): Promise<AdminMetrics> {
    const res = await fetch(`${BASE_URL}/admin/metrics`, {
        headers: {
            ...authHeader(),
        },
    });
    if (!res.ok) throw new Error("Failed to load metrics");
    return res.json();
}

// MockPSP fault config ayarı için (sonra kullanacağız)
export async function setMockFaultConfig(cfg: {
    failureRate: number;
    addLatencyMs: number;
    forceTimeout: boolean;
}): Promise<void> {
    const res = await fetch(`${BASE_URL}/admin/mockpsp/config`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...authHeader(),
        },
        body: JSON.stringify(cfg),
    });
    if (!res.ok) throw new Error("Failed to update mock config");
}