const BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

// Inmemory copy of the Basic Auth token so we do not Base64 encode on every request
let authToken: string | null = null;

export function setCredentials(username: string, password: string) {
    // Basic Auth uses base64(username:password)
    authToken = btoa(`${username}:${password}`);
    localStorage.setItem("authToken", authToken);
}

// Builds Authorization header if credentials exist
function authHeader(): HeadersInit | undefined {
    // If the app was refreshed try to restore the token from localStorage
    if (!authToken) {
        const stored = localStorage.getItem("authToken");
        if (stored) {
            authToken = stored;
        }
    }

    // If there is no token we send the request without auth and handle 401 in the caller
    if (!authToken) {
        return undefined;// public istek gibi gider401 alırsak FEde yakalar
    }

    return {Authorization: `Basic ${authToken}`};
}

// Shared fetch wrapper that automatically attaches auth (when available)
async function doFetch(url: string, init: RequestInit = {}): Promise<Response> {
    const res = await fetch(url, {
        ...init,
        headers: {
            ...(init.headers || {}),
            ...(authHeader() ?? {}),
        },
    });

    // If the backend rejects auth clear it and force re-login
    if (res.status === 401) {
        clearCredentials();
        throw new Error("Unauthorized");
    }
    return res;
}

// Reads JSON for successful responses and throws a readable error for failures
async function handleJson<T>(res: Response): Promise<T> {
    if (res.status === 401) {
        clearCredentials();
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

// Query string builder for pagination and filters
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
    // Returns providerName:up/down map from the admin endpoint
    const res = await doFetch(`${BASE_URL}/admin/providers`);
    return handleJson<ProvidersResponse>(res);
}

// Backend expects up or down as a path parameter
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
    // Response body is not used by the UI call is just to ensure it succeeded
    await handleJson<any>(res);
}

export async function fetchMetrics(): Promise<AdminMetrics> {
    // Aggregated KPIs used by the Metrics page
    const res = await doFetch(`${BASE_URL}/admin/metrics`);
    return handleJson<AdminMetrics>(res);
}

export async function setMockFaultConfig(cfg: {
    failureRate: number;
    addLatencyMs: number;
    forceTimeout: boolean;
}): Promise<void> {
    // Admin endpoint that updates MockPSP behaviour for demos (failures latency timeout)
    const res = await doFetch(`${BASE_URL}/admin/mockpsp/config`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(cfg),
    })
    await handleJson<any>(res);
}

// Clears auth both in memory and in localStorage
export function clearCredentials() {
    authToken = null;
    localStorage.removeItem("authToken");
}

// Used on app start to keep the user logged in after refresh
export function hasAuthToken(): boolean {
    if (authToken) return true;
    const stored = localStorage.getItem("authToken");
    if (stored) {
        authToken = stored;
        return true;
    }
    return false;
}

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

// Clientside correlation id helps match UI actions to backend logs via the CorrelationFilter
export async function createPayment(
    req: CreatePaymentRequest
): Promise<CreatePaymentResult> {
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

    // Backend returns a PaymentResponse even when status is non-2xx in some cases
    const body: PaymentResponse = await res.json();

    if (!res.ok) {
        // Prefer backend message if present so the UI shows something meaningful
        throw new Error(body.message || "Failed to create payment");
    }

    // Backend echoes the correlation id in the response header if CorrelationFilter is enabled
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

// Loads routing history for a single payment from the admin endpoint
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