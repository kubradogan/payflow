import React, { useEffect, useState } from "react";
import {
    fetchPayments,
    fetchProviders,
    fetchMetrics,
    setProviderStatus,
    setMockFaultConfig,
    PaymentItem,
    ProvidersResponse,
    AdminMetrics,
} from "./api";
import "./App.css";

type Tab = "payments" | "providers" | "metrics";

function formatDate(iso: string) {
    return new Date(iso).toLocaleString();
}

function App() {
    const [activeTab, setActiveTab] = useState<Tab>("payments");

    return (
        <div className="app-root">
            <header className="app-header">
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
            </header>

            <main className="app-main">
                {activeTab === "payments" && <PaymentsView />}
                {activeTab === "providers" && <ProvidersView />}
                {activeTab === "metrics" && <MetricsView />}
            </main>
        </div>
    );
}

function PaymentsView() {
    const [items, setItems] = useState<PaymentItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchPayments();
            setItems(data);
        } catch (e: any) {
            setError(e.message ?? "Failed to load payments");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    return (
        <section>
            <div className="section-header">
                <h2>Recent Payments</h2>
                <button onClick={load}>Refresh</button>
            </div>
            {loading && <p>Loading...</p>}
            {error && <p className="error">{error}</p>}
            {!loading && !error && (
                <table className="table">
                    <thead>
                    <tr>
                        <th>Created At</th>
                        <th>ID</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Provider</th>
                        <th>Message</th>
                    </tr>
                    </thead>
                    <tbody>
                    {items.map((p) => (
                        <tr key={p.id}>
                            <td>{formatDate(p.createdAt)}</td>
                            <td>{p.id}</td>
                            <td>
                                {p.amount} {p.currency}
                            </td>
                            <td>{p.status}</td>
                            <td>{p.provider}</td>
                            <td>{p.message ?? "-"}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}
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
                <button onClick={load}>Refresh</button>
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

            <div className="card" style={{ marginTop: "1.5rem" }}>
                <h3>MockPSP Fault Injection</h3>
                <p>
                    Demo için <strong>MockPSP</strong>’ye %50 failure + 500ms extra
                    latency ver.
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
                <button onClick={load}>Refresh</button>
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

            <div className="card" style={{ marginTop: "1.5rem" }}>
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

export default App;