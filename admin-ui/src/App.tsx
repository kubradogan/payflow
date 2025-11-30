import React, {useEffect, useState} from "react";
import {
    fetchPayments,
    fetchProviders,
    fetchMetrics,
    setProviderStatus,
    setMockFaultConfig,
    setCredentials,
    hasAuthToken,
    clearCredentials,
    createPayment,
    PaymentItem,
    PaymentPage,
    ProvidersResponse,
    AdminMetrics,
    fetchPaymentDecisions,
    PaymentDecision
} from "./api";
import "./App.css";

type Tab = "payments" | "providers" | "metrics";

type ToastState = {
    type: "success" | "error";
    message: string;
} | null;

type RoutingModalState = {
    paymentId: string;
    decisions: PaymentDecision[];
    loading: boolean;
    error: string | null;
} | null;

/* LOGIN */

type LoginProps = {
    onSuccess: () => void;
};

// Amount cent cinsinden geliyo
function formatAmount(amount: number, currency: string) {
    // 100 cent = 1 birim
    const value = amount / 100;

    return new Intl.NumberFormat("en-IE", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

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
            setCredentials(username, password);
            // basit ping: metrics çek, auth doğru mu kontrol et
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
                <div className="login-title">PayFlow – Admin</div>
                <div className="login-sub">
                    Secure access to intelligent payment routing and live metrics.
                </div>
                <form className="login-form" onSubmit={handleSubmit}>
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
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? "Signing in…" : "Login"}
                    </button>
                </form>
            </div>
        </div>
    );
}

/* LAYOUT */

const PAGES = {
    PAYMENTS: "payments" as Tab,
    PROVIDERS: "providers" as Tab,
    METRICS: "metrics" as Tab,
};

type TopbarProps = {
    onLogout: () => void;
};

function Topbar({onLogout}: TopbarProps) {
    return (
        <header className="app-topbar">
            <div className="app-topbar-left">
                <div className="topbar-title">
                    <span className="topbar-title-main">PayFlow – Admin</span>
                    <span className="topbar-title-sub">
            Real-time payment orchestration control panel
          </span>
                </div>
            </div>
            <div className="app-topbar-right">
                <span className="logged-in-chip">Logged in as admin</span>
                <button className="btn-logout" onClick={onLogout}>
                    Logout
                </button>
            </div>
        </header>
    );
}

type SidebarProps = {
    active: Tab;
    onChange: (tab: Tab) => void;
};

function Sidebar({active, onChange}: SidebarProps) {
    return (
        <aside className="app-sidebar">
            <div>
                <div className="sidebar-section-title">Navigation</div>
                <nav className="sidebar-nav">
                    <button
                        className={
                            "sidebar-item " + (active === PAGES.PAYMENTS ? "active" : "")
                        }
                        onClick={() => onChange(PAGES.PAYMENTS)}
                    >
                        <span className="icon">💳</span>
                        <span className="text">Payments</span>
                    </button>
                    <button
                        className={
                            "sidebar-item " + (active === PAGES.PROVIDERS ? "active" : "")
                        }
                        onClick={() => onChange(PAGES.PROVIDERS)}
                    >
                        <span className="icon">🏦</span>
                        <span className="text">Providers</span>
                    </button>
                    <button
                        className={
                            "sidebar-item " + (active === PAGES.METRICS ? "active" : "")
                        }
                        onClick={() => onChange(PAGES.METRICS)}
                    >
                        <span className="icon">📊</span>
                        <span className="text">Metrics</span>
                    </button>
                </nav>
            </div>

            <div className="sidebar-sub">
                <strong
                    style={{
                        display: "block",
                        marginBottom: 4,
                        fontSize: 15,
                    }}
                >
                    PayFlow
                </strong>
                <span style={{fontSize: 15}}>
          Built as a resilient multi-PSP payment orchestration layer with
          intelligent routing and automatic failover.
        </span>
            </div>
        </aside>
    );
}

/* PAYMENTS PAGE */

type PaymentsPageProps = {
    reloadKey: number;
    onNewPaymentClick: () => void;
    onViewRouting: (paymentId: string) => void;
};

function formatDate(iso: string) {
    return new Date(iso).toLocaleString();
}

function PaymentsPage({reloadKey, onNewPaymentClick, onViewRouting}: PaymentsPageProps) {
    const [data, setData] = useState<PaymentPage | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [searchText, setSearchText] = useState("");
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
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, statusFilter, reloadKey]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(0);
        load();
    };

    const total = data?.total ?? 0;
    const from = total === 0 ? 0 : page * pageSize + 1;
    const to = data ? page * pageSize + data.items.length : 0;
    const totalPages = data ? Math.ceil(total / pageSize) : 0;

    // basit KPI’lar (liste verisinden)
    const successCount =
        data?.items.filter((p) => p.status === "SUCCEEDED").length ?? 0;
    const failedCount =
        data?.items.filter((p) => p.status === "FAILED").length ?? 0;

    return (
        <section className="page">
            <div className="page-header">
                <div className="page-title-block">
                    <h1 className="page-title">Recent Payments</h1>
                    <span className="page-subtitle">
            Inspect, filter and observe routing decisions and outcomes.
          </span>
                </div>
                <div className="page-actions">
                    <button className="btn-ghost" type="button" onClick={load}>
                        Refresh
                    </button>
                    <button
                        className="btn-primary"
                        type="button"
                        onClick={onNewPaymentClick}
                    >
                        + New Payment
                    </button>
                </div>
            </div>

            <div className="kpi-strip">
                <div className="kpi-card">
                    <div className="kpi-label">Page Volume</div>
                    <div className="kpi-value">
                        <div className="kpi-value">
                            {data
                                ? formatAmount(
                                    data.items.reduce((acc, p) => acc + p.amount, 0),
                                    // sayfadaki tüm ödemeler aynı currency yoksa ilkini baz al
                                    data.items[0]?.currency ?? "EUR"
                                )
                                : formatAmount(0, "EUR")}
                        </div>
                    </div>
                    <div className="kpi-trend">
                        {data ? `${data.items.length} payments on this page` : "No data yet"}
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Succeeded</div>
                    <div className="kpi-value">{successCount}</div>
                    <div className="kpi-trend">Using current filters</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Failed</div>
                    <div className="kpi-value">{failedCount}</div>
                    <div className="kpi-trend">Investigate error causes</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Current Page</div>
                    <div className="kpi-value">
                        {totalPages === 0 ? 0 : page + 1} / {totalPages || 0}
                    </div>
                    <div className="kpi-trend">{total} total payments</div>
                </div>
            </div>

            <div className="card table-card">
                <div className="card-header">
                    <div>
                        <span className="card-title">Payments</span>
                        <span className="card-subtitle">
              &nbsp;Latest activity (paginated)
            </span>
                    </div>
                </div>

                <form className="filters-row" onSubmit={handleSearchSubmit}>
                    <input
                        className="input-pill"
                        placeholder="Search by idempotency key or provider…"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                    <select
                        className="select-pill"
                        value={statusFilter}
                        onChange={(e) =>
                            setStatusFilter(e.target.value as "ALL" | "SUCCEEDED" | "FAILED" | "PENDING")
                        }
                    >
                        <option value="ALL">All statuses</option>
                        <option value="SUCCEEDED">SUCCEEDED</option>
                        <option value="FAILED">FAILED</option>
                        <option value="PENDING">PENDING</option>
                    </select>
                    <button className="btn-ghost" type="submit">
                        Apply
                    </button>
                </form>

                {loading && (
                    <div className="loading-center">
                        <div className="spinner"/>
                    </div>
                )}
                {error && <p className="error" style={{marginTop: 8}}>{error}</p>}

                {!loading && !error && (
                    <>
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                <tr>
                                    <th>ID (short)</th>
                                    <th>Idempotency Key</th>
                                    <th className="amount">Amount</th>
                                    <th>Currency</th>
                                    <th>Status</th>
                                    <th>Provider</th>
                                    <th>Routing</th>
                                    <th>Message</th>
                                    <th>Created At</th>
                                </tr>
                                </thead>
                                <tbody>
                                {!data || data.items.length === 0 ? (
                                    <tr>
                                        <td colSpan={9}>No payments loaded.</td>
                                    </tr>
                                ) : (
                                    data.items.map((p: PaymentItem) => {
                                        const statusClass =
                                            p.status === "SUCCEEDED"
                                                ? "status-succeeded"
                                                : p.status === "FAILED"
                                                    ? "status-failed"
                                                    : "status-pending";
                                        return (
                                            <tr key={p.id}>
                                                <td>
                                                    {p.id.slice(0, 8)}…{p.id.slice(-4)}
                                                </td>
                                                <td>{p.idempotencyKey}</td>
                                                <td className="amount">{formatAmount(p.amount, p.currency)}</td>
                                                <td>{p.currency}</td>
                                                <td>
                                                    <span className={`status-badge ${statusClass}`}>
                                                      {p.status}
                                                    </span>
                                                </td>
                                                <td>{p.provider}</td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn-ghost"
                                                        onClick={() => onViewRouting(p.id)}
                                                    >
                                                        View
                                                    </button>
                                                </td>
                                                <td>{p.message ?? "-"}</td>
                                                <td>{formatDate(p.createdAt)}</td>
                                            </tr>
                                        );
                                    })
                                )}
                                </tbody>
                            </table>
                        </div>

                        <div className="table-footer">
              <span>
                Showing {from}-{to} of {total}
              </span>
                            <span>
                <button
                    type="button"
                    className="btn-ghost"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    style={{marginRight: 4}}
                >
                  Prev
                </button>
                <button
                    type="button"
                    className="btn-ghost"
                    disabled={totalPages === 0 || page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </span>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}

/* PROVIDERS PAGE */

type ProvidersPageProps = {
    notify: (msg: string, type?: "success" | "error") => void;
};

function ProvidersPage({notify}: ProvidersPageProps) {
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

    const toggleProvider = async (name: string) => {
        const current = providers[name];
        try {
            await setProviderStatus(name, !current);
            await load();
            notify(
                `Provider "${name}" is now ${!current ? "UP" : "DOWN"}.`,
                "success"
            );
        } catch (e: any) {
            notify("Failed to update provider status.", "error");
        }
    };

    const mock50 = async () => {
        try {
            await setMockFaultConfig({
                failureRate: 0.5,
                addLatencyMs: 500,
                forceTimeout: false,
            });
            notify("MockPSP fault: 50% failure + 500ms latency set.", "success");
        } catch {
            notify("Failed to update MockPSP config.", "error");
        }
    };

    const mockTimeout = async () => {
        try {
            await setMockFaultConfig({
                failureRate: 0.0,
                addLatencyMs: 0,
                forceTimeout: true,
            });
            notify("MockPSP forced timeout set (failover demo).", "success");
        } catch {
            notify("Failed to update MockPSP config.", "error");
        }
    };

    return (
        <section className="page">
            <div className="page-header">
                <div className="page-title-block">
                    <h1 className="page-title">Providers</h1>
                    <span className="page-subtitle">
            Control PSP health, simulate faults and validate automatic failover.
          </span>
                </div>
                <div className="page-actions">
                    <button className="btn-ghost" type="button" onClick={load}>
                        Refresh
                    </button>
                </div>
            </div>

            {loading && (
                <div className="loading-center">
                    <div className="spinner"/>
                </div>
            )}
            {error && <p className="error">{error}</p>}

            {!loading && !error && (
                <>
                    <div className="providers-grid">
                        {Object.entries(providers).map(([name, up]) => (
                            <div key={name} className="provider-card">
                                <div className="provider-header">
                                    <div>
                                        <div className="provider-name">{name}</div>
                                        <div className="provider-status">
                                            Status: {up ? "UP" : "DOWN"}
                                        </div>
                                    </div>
                                    <span className={up ? "badge-up" : "badge-down"}>
                    {up ? "Healthy" : "Degraded"}
                  </span>
                                </div>
                                <div
                                    style={{
                                        marginTop: 10,
                                        fontSize: 15,
                                        color: "#9ca3af",
                                    }}
                                >
                                    Routed volume last 24h: <strong>–</strong> (demo).
                                    <br/>
                                    Error rate last hour: <strong>–</strong>.
                                </div>
                                <div
                                    style={{
                                        marginTop: 10,
                                        display: "flex",
                                        gap: 8,
                                    }}
                                >
                                    <button
                                        className="btn-ghost"
                                        type="button"
                                        onClick={() => toggleProvider(name)}
                                    >
                                        Mark as {up ? "DOWN" : "UP"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="card" style={{marginTop: 14}}>
                        <div className="card-header">
                            <div>
                                <span className="card-title">MockPSP Fault Injection</span>
                                <span className="card-subtitle">
                  &nbsp;Use this to demonstrate success uplift and failover.
                </span>
                            </div>
                        </div>
                        <div style={{display: "flex", gap: 8}}>
                            <button className="btn-primary" type="button" onClick={mock50}>
                                50% fail + 500ms latency
                            </button>
                            <button className="btn-ghost" type="button" onClick={mockTimeout}>
                                Force timeout (failover)
                            </button>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}

/* METRICS PAGE */

type MetricsPageProps = {};

function MetricsPage({}: MetricsPageProps) {
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

    if (loading) {
        return (
            <section className="page">
                <div className="loading-center">
                    <div className="spinner"/>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="page">
                <p className="error">{error}</p>
            </section>
        );
    }

    if (!metrics) {
        return (
            <section className="page">
                <p className="page-subtitle">No metrics available yet.</p>
            </section>
        );
    }

    const successPercent = (metrics.successRate * 100).toFixed(2);

    return (
        <section className="page">
            <div className="page-header">
                <div className="page-title-block">
                    <h1 className="page-title">Metrics</h1>
                    <span className="page-subtitle">
            Reliability KPIs aggregated across all providers.
          </span>
                </div>
                <div className="page-actions">
                    <button className="btn-ghost" type="button" onClick={load}>
                        Refresh
                    </button>
                </div>
            </div>

            <div className="metrics-grid">
                <div className="metric-card">
                    <div className="metric-label">Success Rate</div>
                    <div className="metric-value">{successPercent}%</div>
                    <div className="metric-extra">Target: &gt; 95% in failover demo</div>
                </div>
                <div className="metric-card">
                    <div className="metric-label">p95 Latency</div>
                    <div className="metric-value">{metrics.p95LatencyMs} ms</div>
                    <div className="metric-extra">
                        Under simulated load (k6, 5–10 RPS)
                    </div>
                </div>
                <div className="metric-card">
                    <div className="metric-label">Failover Count</div>
                    <div className="metric-value">{metrics.failoverCount}</div>
                    <div className="metric-extra">Triggered via MockPSP fault injection</div>
                </div>
            </div>

            <div className="card" style={{marginTop: 14}}>
                <div className="card-header">
                    <span className="card-title">Error Distribution</span>
                    <span className="card-subtitle">
            &nbsp;Simple breakdown by error type / provider.
          </span>
                </div>
                {Object.keys(metrics.errorDistribution).length === 0 ? (
                    <p style={{fontSize: 15, color: "#9ca3af"}}>
                        No errors recorded in the current observation window.
                    </p>
                ) : (
                    <ul style={{fontSize: 15, color: "#e5e7eb"}}>
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

/* MODAL & TOAST */

type NewPaymentModalProps = {
    onClose: () => void;
    onCreated: () => void;
    notify: (msg: string, type?: "success" | "error") => void;
};

function NewPaymentModal({onClose, onCreated, notify}: NewPaymentModalProps) {
    const [amount, setAmount] = useState<number>(1299);
    const [currency, setCurrency] = useState<string>("EUR");
    const [idem, setIdem] = useState<string>("demo-abc-001");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!Number.isFinite(amount) || amount <= 0) {
            notify("Amount must be positive.", "error");
            return;
        }

        try {
            setSubmitting(true);
            const res = await createPayment({
                amount,
                currency,
                idempotencyKey: idem,
            });
            const corrId = (res as any).correlationId;
            const provider = (res as any).payment.provider;
            const paymentId = (res as any).payment.paymentId;
            const status = (res as any).payment.status;
            const msgLines = [
                `Payment ID: ${paymentId}`,
                `Status: ${status}`,
                provider ? `Provider: ${provider}` : null,
                corrId ? `Correlation ID: ${corrId}` : null,
            ].filter(Boolean);

            notify(msgLines.join("\n"), "success");

            onCreated();
            onClose();
        } catch (err: any) {
            notify(
                err?.message ?? "Failed to create payment. Check backend logs.",
                "error"
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal">
                <div className="modal-header">
                    <div className="modal-title">Create New Payment</div>
                    <button className="modal-close" onClick={onClose}>
                        ×
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="field">
                            <span>Amount (cents)</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                            />
                        </div>
                        <div className="field">
                            <span>Currency</span>
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                            >
                                <option value="EUR">EUR</option>
                                <option value="USD">USD</option>
                                <option value="GBP">GBP</option>
                            </select>
                        </div>
                        <div className="field">
                            <span>Idempotency Key</span>
                            <input
                                value={idem}
                                onChange={(e) => setIdem(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn-ghost"
                            onClick={onClose}
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={submitting}>
                            {submitting ? "Submitting…" : "Submit"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

type MessageModalProps = {
    type: "success" | "error";
    message: string;
    onClose: () => void;
};

function MessageModal({ type, message, onClose }: MessageModalProps) {
    return (
        <div className="modal-backdrop">
            <div className="modal">
                <div className="modal-header">
                    <div className="modal-title">
                        {type === "success" ? "Payment Created" : "Payment Failed"}
                    </div>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <pre
                        style={{
                            fontSize: 14,
                            whiteSpace: "pre-wrap",
                            margin: 0,
                            fontFamily: "inherit",
                        }}
                    >
                        {message}
                    </pre>
                </div>
                <div className="modal-footer">
                    <button className="btn-ghost" onClick={onClose}>OK</button>
                </div>
            </div>
        </div>
    );
}

type RoutingDecisionsModalProps = {
    state: RoutingModalState;
    onClose: () => void;
};

function RoutingDecisionsModal({state, onClose}: RoutingDecisionsModalProps) {
    if (!state) return null;

    const shortId = state.paymentId.slice(0, 8) + "…" + state.paymentId.slice(-4);

    return (
        <div className="modal-backdrop">
            <div className="modal">
                <div className="modal-header">
                    <div className="modal-title">
                        Routing decisions for {shortId}
                    </div>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    {state.loading && (
                        <div className="loading-center">
                            <div className="spinner"/>
                        </div>
                    )}

                    {!state.loading && state.error && (
                        <p className="error">{state.error}</p>
                    )}

                    {!state.loading && !state.error && state.decisions.length === 0 && (
                        <p style={{fontSize: 14, color: "#9ca3af"}}>
                            No routing decisions recorded for this payment.
                        </p>
                    )}

                    {!state.loading && !state.error && state.decisions.length > 0 && (
                        <table className="table">
                            <thead>
                            <tr>
                                <th>Chosen Provider</th>
                                <th>Reason</th>
                                <th>Decided At</th>
                            </tr>
                            </thead>
                            <tbody>
                            {state.decisions.map((d, idx) => (
                                <tr key={idx}>
                                    <td>{d.chosenProvider}</td>
                                    <td>{d.reason}</td>
                                    <td>{new Date(d.decidedAt).toLocaleString()}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn-ghost" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

type ToastProps = {
    toast: ToastState;
};

function Toast({toast}: ToastProps) {
    if (!toast) return null;
    return (
        <div
            className="toast"
            style={
                toast.type === "error"
                    ? {
                        borderColor: "rgba(239,68,68,0.8)",
                        color: "#fecaca",
                    }
                    : undefined
            }
        >
            {toast.message}
        </div>
    );
}

/* ROOT APP */

function App() {
    const [loggedIn, setLoggedIn] = useState<boolean>(() => hasAuthToken());
    const [activeTab, setActiveTab] = useState<Tab>("payments");
    const [showNewPayment, setShowNewPayment] = useState(false);
    const [paymentsReloadKey, setPaymentsReloadKey] = useState(0);
    const [toast, setToast] = useState<ToastState>(null);
    const [resultModal, setResultModal] = useState<ToastState | null>(null);
    const [routingModal, setRoutingModal] = useState<RoutingModalState>(null);

    const notify = (message: string, type: "success" | "error" = "success") => {
        setToast({type, message});
        // 3 saniye sonra kapat
        setTimeout(() => {
            setToast((prev) => (prev && prev.message === message ? null : prev));
        }, 3000);
    };

    // Providers vb. için klasik toast
    const notifyToast = (message: string, type: "success" | "error" = "success") => {
        setToast({type, message});
        setTimeout(() => {
            setToast(prev => (prev && prev.message === message ? null : prev));
        }, 3000);
    };

    // Sadece yeni payment için kullanılacak modal notify
    const notifyResultModal = (message: string, type: "success" | "error" = "success") => {
        setResultModal({type, message});
    };
    const openRoutingModal = async (paymentId: string) => {
        // İlk açılışta loading
        setRoutingModal({
            paymentId,
            decisions: [],
            loading: true,
            error: null,
        });

        try {
            const data = await fetchPaymentDecisions(paymentId);
            setRoutingModal({
                paymentId,
                decisions: data,
                loading: false,
                error: null,
            });
        } catch (e: any) {
            setRoutingModal({
                paymentId,
                decisions: [],
                loading: false,
                error: e?.message ?? "Failed to load routing decisions",
            });
        }
    };

    const closeRoutingModal = () => {
        setRoutingModal(null);
    };


    const handleLogout = () => {
        clearCredentials();
        setLoggedIn(false);
    };

    if (!loggedIn) {
        return <LoginView onSuccess={() => setLoggedIn(true)}/>;
    }

    return (
        <div className="app-root">
            <Topbar onLogout={handleLogout}/>
            <Sidebar active={activeTab} onChange={setActiveTab}/>
            <main className="app-main">
                {activeTab === "payments" && (
                    <PaymentsPage
                        reloadKey={paymentsReloadKey}
                        onNewPaymentClick={() => setShowNewPayment(true)}
                        onViewRouting={openRoutingModal}
                    />
                )}
                {/* Providers, toast kullanmaya devam etsin */}
                {activeTab === "providers" && <ProvidersPage notify={notifyToast}/>}
                {activeTab === "metrics" && <MetricsPage/>}
            </main>

            {showNewPayment && (
                <NewPaymentModal
                    onClose={() => setShowNewPayment(false)}
                    onCreated={() => setPaymentsReloadKey(k => k + 1)}
                    notify={notifyResultModal}   // ÖNEMLİ: artık modalı açıyoruz
                />
            )}

            {/* Sağ alttaki küçük toast (Providers vb.) */}
            <Toast toast={toast}/>

            {resultModal && (
                <MessageModal
                    type={resultModal.type}
                    message={resultModal.message}
                    onClose={() => setResultModal(null)}
                />
            )}

            {routingModal && (
                <RoutingDecisionsModal
                    state={routingModal}
                    onClose={closeRoutingModal}
                />
            )}
        </div>
    );
}

export default App;