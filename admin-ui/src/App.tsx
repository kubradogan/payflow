import React, {useEffect, useState} from "react";
import {
    fetchPayments,
    fetchProviders,
    fetchMetrics,
    setProviderStatus,
    setMockFaultConfig,
    setCredentials,
    PaymentItem,
    ProvidersResponse,
    AdminMetrics,
    hasAuthToken,
    clearCredentials,
    createPayment,
    PaymentPage,
    PaymentResponse
} from "./api";
import "./App.css";

type Tab = "payments" | "providers" | "metrics";

function formatDate(iso: string) {
    return new Date(iso).toLocaleString();
}

type LoginProps = {
    onSuccess: () => void;
};

function LoginView({onSuccess}: LoginProps) {
    const [username, setUsername] = useState("admin");
    const [password, setPassword] = useState("admin123");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Kimlik bilgilerini sakla (Basic <base64>)
            setCredentials(username, password);
            await fetchMetrics();

            onSuccess();
        } catch (err) {
            setError("Invalid username or password");
            clearCredentials();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-root">
            <div className="login-card">
                <h1>PayFlow Admin Login</h1>
                <form onSubmit={handleSubmit} className="login-form">
                    <label>
                        Username
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </label>
                    <label>
                        Password
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </label>
                    {error && <p className="error">{error}</p>}
                    <button type="submit" disabled={loading}>
                        {loading ? "Signing in..." : "Login"}
                    </button>
                </form>
            </div>
        </div>
    );
}

//NEW PAYMENT MODAL

type NewPaymentModalProps = {
    open: boolean;
    onClose: () => void;
    onCreated: () => void; // başarıdan sonra listeyi yenilemek için
};

function NewPaymentModal({open, onClose, onCreated}: NewPaymentModalProps) {
    const [amount, setAmount] = useState<string>("1299");
    const [currency, setCurrency] = useState<string>("EUR");
    const [idempotencyKey, setIdempotencyKey] = useState<string>("demo-abc-001");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<PaymentResponse | null>(null);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        setResult(null);

        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            setError("Amount must be a positive number");
            setSubmitting(false);
            return;
        }

        try {
            const created = await createPayment({
                amount: numericAmount,
                currency,
                idempotencyKey,
            });
            setResult(created);
            onCreated(); // listeyi yenile
        } catch (err: any) {
            setError(err.message ?? "Failed to create payment");
        } finally {
            setSubmitting(false);
        }
    };

    // Sonuç ekranında sadece Close butonu
    if (result) {
        return (
            <div className="modal-backdrop">
                <div className="modal">
                    <div className="modal-header">
                        <h2>Create New Payment</h2>
                        <button
                            className="modal-close"
                            onClick={() => {
                                setResult(null);
                                onClose();
                            }}
                        >
                            ×
                        </button>
                    </div>
                    <div className="modal-body">
                        <p><strong>id:</strong> {result.paymentId}</p>
                        <p>
                            <strong>status:</strong>{" "}
                            <span
                                className={`status-badge status-${result.status.toLowerCase()}`}
                            >
                                {result.status}
                            </span>
                        </p>
                        <p><strong>provider:</strong> {result.provider}</p>
                        {result.message && (
                            <p><strong>message:</strong> {result.message}</p>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button
                            className="btn-secondary"
                            onClick={() => {
                                setResult(null);
                                onClose();
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Form ekranı
    return (
        <div className="modal-backdrop">
            <div className="modal">
                <div className="modal-header">
                    <h2>Create New Payment</h2>
                    <button className="modal-close" onClick={onClose}>
                        ×
                    </button>
                </div>
                <form className="modal-body" onSubmit={handleSubmit}>
                    <label className="field">
                        <span>Amount (cents)</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </label>
                    <label className="field">
                        <span>Currency</span>
                        <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                        >
                            <option value="EUR">EUR</option>
                            <option value="USD">USD</option>
                            <option value="GBP">GBP</option>
                        </select>
                    </label>
                    <label className="field">
                        <span>Idempotency Key</span>
                        <input
                            type="text"
                            value={idempotencyKey}
                            onChange={(e) => setIdempotencyKey(e.target.value)}
                        />
                    </label>
                    {error && <p className="error">{error}</p>}
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={submitting}>
                            {submitting ? "Submitting..." : "Submit"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


function PaymentsView() {
    const [data, setData] = useState<PaymentPage | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [searchText, setSearchText] = useState("");
    const [showNewPayment, setShowNewPayment] = useState(false);
    const [statusFilter, setStatusFilter] =
        useState<"ALL" | "SUCCEEDED" | "FAILED" | "PENDING">("ALL");
    const [page, setPage] = useState(0);
    const pageSize = 10;

    const load = async () => {
        try {
            setLoading(true);
            setError(null);
            const resp = await fetchPayments({
                page,
                size: pageSize,
                query: searchText,
                status: statusFilter,
            });
            setData(resp);
        } catch (e: any) {
            setError(e.message ?? "Failed to load payments");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // page veya status değiştiğinde tekrar yükle
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, statusFilter]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(0);  // yeni aramada başa dön
        load();
    };

    const total = data?.total ?? 0;
    const from = total === 0 ? 0 : page * pageSize + 1;
    const to = data ? page * pageSize + data.items.length : 0;
    const totalPages = data ? Math.ceil(total / pageSize) : 0;

    return (
        <section>
            <div className="section-header section-header-with-filters">
                <h2>Recent Payments</h2>
                <button onClick={load}>Refresh</button>
            </div>

            <form className="payments-filters" onSubmit={handleSearchSubmit}>
                <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setShowNewPayment(true)}
                >
                    + New Payment
                </button>

                <input
                    className="input-search"
                    placeholder="Search by idempotency key / provider"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                />

                <select
                    className="select-status"
                    value={statusFilter}
                    onChange={(e) => {
                        setPage(0);
                        setStatusFilter(e.target.value as any);
                    }}
                >
                    <option value="ALL">All Status</option>
                    <option value="SUCCEEDED">Succeeded</option>
                    <option value="PENDING">Pending</option>
                    <option value="FAILED">Failed</option>
                </select>
            </form>

            {loading && <p>Loading...</p>}
            {error && <p className="error">{error}</p>}

            {!loading && !error && data && (
                <>
                    <table className="table">
                        <thead>
                        <tr>
                            <th>ID (short)</th>
                            <th>Amount</th>
                            <th>Currency</th>
                            <th>Status</th>
                            <th>Provider</th>
                            <th>Message</th>
                            <th>Created At</th>
                        </tr>
                        </thead>
                        <tbody>
                        {data.items.map((p: PaymentItem) => (
                            <tr key={p.id}>
                                <td>{p.id.slice(0, 8)}…{p.id.slice(-4)}</td>
                                <td>{p.amount}</td>
                                <td>{p.currency}</td>
                                <td>{p.status}</td>
                                <td>{p.provider}</td>
                                <td>{p.message ?? "-"}</td>
                                <td>{formatDate(p.createdAt)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>


                    <div className="pagination-bar">
                        <span>
                            Showing {from}-{to} / {total}
                        </span>
                        <div className="pagination-buttons">
                            <button
                                type="button"
                                disabled={page === 0}
                                onClick={() => setPage((p) => p - 1)}
                            >
                                Prev
                            </button>
                            <span>{totalPages === 0 ? 0 : page + 1} / {totalPages}</span>
                            <button
                                type="button"
                                disabled={totalPages === 0 || page >= totalPages - 1}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </>
            )}

            <NewPaymentModal
                open={showNewPayment}
                onClose={() => setShowNewPayment(false)}
                onCreated={() => {
                    // yeni payment yaratılınca listeyi yenile
                    setPage(0);
                    load();
                }}
            />
        </section>
    );
}

function ProvidersView() {
    const [providers, setProviders] = useState<ProvidersResponse>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchProviders();
            setProviders(data);
        } catch (e: any) {
            setError(e.message ?? "Failed to load providers");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const toggle = async (name: string) => {
        const current = providers[name];
        try {
            await setProviderStatus(name, !current);
            await load();
        } catch (e: any) {
            alert(e.message ?? "Failed to update provider");
        }
    };

    const setMockFault50 = async () => {
        try {
            await setMockFaultConfig({
                failureRate: 0.5,
                addLatencyMs: 500,
                forceTimeout: false,
            });
            alert("MockPSP fault config set (50% fail, +500ms latency)");
        } catch (e: any) {
            alert(e.message ?? "Failed to update mock config");
        }
    };

    return (
        <section>
            <div className="section-header">
                <h2>Providers</h2>
                <button className="btn-primary" onClick={load}>Refresh</button>
            </div>
            {loading && <p>Loading...</p>}
            {error && <p className="error">{error}</p>}
            {!loading && !error && (
                <div className="providers-grid">
                    {Object.entries(providers).map(([name, up]) => (
                        <div key={name} className="card">
                            <h3>{name}</h3>
                            <p>Status: {up ? "UP" : "DOWN"}</p>
                            <button onClick={() => toggle(name)}>
                                Mark as {up ? "DOWN" : "UP"}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="card" style={{marginTop: "1.5rem"}}>
                <h3>MockPSP Fault Injection</h3>
                <p>
                    Demo için <strong>MockPSP</strong>’ye %50 failure + 500ms extra latency ver.
                </p>
                <button onClick={setMockFault50}>Apply demo faults</button>
            </div>
        </section>
    );
}

function MetricsView() {
    const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        try {
            setLoading(true);
            setError(null);
            const m = await fetchMetrics();
            setMetrics(m);
        } catch (e: any) {
            setError(e.message ?? "Failed to load metrics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    if (loading) return <p>Loading...</p>;
    if (error) return <p className="error">{error}</p>;
    if (!metrics) return null;

    const successPercent = (metrics.successRate * 100).toFixed(2);

    return (
        <section>
            <div className="section-header">
                <h2>Metrics</h2>
                <button className="btn-primary" onClick={load}>Refresh</button>
            </div>
            <div className="metrics-grid">
                <div className="card">
                    <h3>Success Rate</h3>
                    <p className="big">{successPercent}%</p>
                </div>
                <div className="card">
                    <h3>p95 Latency</h3>
                    <p className="big">{metrics.p95LatencyMs} ms</p>
                </div>
                <div className="card">
                    <h3>Failover Count</h3>
                    <p className="big">{metrics.failoverCount}</p>
                </div>
            </div>

            <div className="card" style={{marginTop: "1.5rem"}}>
                <h3>Error Distribution</h3>
                {Object.keys(metrics.errorDistribution).length === 0 ? (
                    <p>No errors recorded.</p>
                ) : (
                    <ul>
                        {Object.entries(metrics.errorDistribution).map(([k, v]) => (
                            <li key={k}>
                                {k}: {v}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}

function App() {
    const [loggedIn, setLoggedIn] = useState<boolean>(() => hasAuthToken());
    const [activeTab, setActiveTab] = useState<Tab>("payments");

    if (!loggedIn) {
        return <LoginView onSuccess={() => setLoggedIn(true)}/>;
    }

    const handleLogout = () => {
        clearCredentials();
        setLoggedIn(false);
    };

    return (
        <div className="app-root">
            <header className="app-header">
                <div className="app-header-left">
                    <h1>PayFlow – Admin Dashboard</h1>
                    <nav className="tabs">
                        <button
                            className={activeTab === "payments" ? "tab active" : "tab"}
                            onClick={() => setActiveTab("payments")}
                        >
                            Payments
                        </button>
                        <button
                            className={activeTab === "providers" ? "tab active" : "tab"}
                            onClick={() => setActiveTab("providers")}
                        >
                            Providers
                        </button>
                        <button
                            className={activeTab === "metrics" ? "tab active" : "tab"}
                            onClick={() => setActiveTab("metrics")}
                        >
                            Metrics
                        </button>
                    </nav>
                </div>

                <div className="app-header-right">
                    <span className="logged-in-text">Logged in as admin</span>
                    <button className="btn-logout" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </header>

            <main className="app-main">
                {activeTab === "payments" && <PaymentsView/>}
                {activeTab === "providers" && <ProvidersView/>}
                {activeTab === "metrics" && <MetricsView/>}
            </main>
        </div>
    );
}

export default App;