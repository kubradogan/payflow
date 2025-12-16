import React, {useEffect, useState} from "react";
import "../../App.css";
import {
    fetchProviders,
    setProviderStatus,
    setMockFaultConfig,
    type ProvidersResponse,
} from "../../api";

type ProvidersPageProps = {
    // Parentlevel helper to show toast/snackbar style feedback
    notify: (msg: string, type?: "success" | "error") => void;
};

export function ProvidersPage({notify}: ProvidersPageProps) {
    // Map of providerName -> up/down state returned by the backend admin endpoint
    const [providers, setProviders] = useState<ProvidersResponse>({});

    // Simple UI state for async calls
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        // Pulls the current provider health snapshot from the backend
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
        // Load once when the page is first opened
        load();
    }, []);

    const toggleProvider = async (name: string) => {
        // Flips provider state to demonstrate routing behaviour when a PSP is marked down
        const current = providers[name];
        try {
            await setProviderStatus(name, !current);
            await load();
            notify(`Provider "${name}" is now ${!current ? "UP" : "DOWN"}`, "success");
        } catch (e: any) {
            notify("Failed to update provider status", "error");
        }
    };

    const mock50 = async () => {
        // Demo setting for MockPSP to make successrate and latency changes visible in metrics
        try {
            await setMockFaultConfig({
                failureRate: 0.5,
                addLatencyMs: 500,
                forceTimeout: false,
            });
            notify("MockPSP fault set: 50% failure + 500ms latency", "success");
        } catch {
            notify("Failed to update MockPSP config", "error");
        }
    };

    const mockTimeout = async () => {
        // Demo setting intended to trigger failover (MockPSP throws after a simulated delay)
        try {
            await setMockFaultConfig({
                failureRate: 0.0,
                addLatencyMs: 0,
                forceTimeout: true,
            });
            notify("MockPSP forced timeout set for failover demo", "success");
        } catch {
            notify("Failed to update MockPSP config", "error");
        }
    };

    return (
        <section className="page providers-page">
            <div className="page-header">
                <div className="page-title-block">
                    <h1 className="page-title">Providers</h1>
                    <span className="page-subtitle">
                        Control PSP health, simulate faults and validate automatic failover
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
                                    Routed volume last 24h: <strong>–</strong> (demo)
                                    <br/>
                                    Error rate last hour: <strong>–</strong>
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
                                    &nbsp;Use this to demonstrate success uplift and failover
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