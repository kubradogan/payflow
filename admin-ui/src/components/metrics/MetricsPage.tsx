import React, {useEffect, useState} from "react";
import "../../App.css";
import {fetchMetrics, type AdminMetrics} from "../../api";

type MetricsPageProps = {};

export function MetricsPage({}: MetricsPageProps) {
    // Holds the latest aggregated metrics returned by the backend
    const [metrics, setMetrics] = useState<AdminMetrics | null>(null);

    // Simple UI state for async loading and failure handling
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Loads metrics from the /admin/metrics endpoint
    const load = async () => {
        try {
            setLoading(true);
            setError(null);
            const m = await fetchMetrics();
            setMetrics(m);
        } catch (e: any) {
            // Keeps a readable message for the UI rather than exposing raw error objects
            setError(e.message ?? "Failed to load metrics");
        } finally {
            setLoading(false);
        }
    };

    // Fetch metrics once when the page is first rendered
    useEffect(() => {
        load();
    }, []);

    // Loading state shown while the request is in-flight
    if (loading) {
        return (
            <section className="page">
                <div className="loading-center">
                    <div className="spinner"/>
                </div>
            </section>
        );
    }

    // Error state shown when the request fails or auth is missing
    if (error) {
        return (
            <section className="page">
                <p className="error">{error}</p>
            </section>
        );
    }

    // Empty state for a fresh system before any provider stats exist
    if (!metrics) {
        return (
            <section className="page">
                <p className="page-subtitle">No metrics available yet.</p>
            </section>
        );
    }

    // Converts successRate from 0..1 into a percentage string for display
    const successPercent = (metrics.successRate * 100).toFixed(2);

    return (
        <section className="page metrics-page">
            <div className="page-header">
                <div className="page-title-block">
                    <h1 className="page-title">Metrics</h1>
                    <span className="page-subtitle">
                        Reliability KPIs aggregated across all providers.
                    </span>
                </div>

                <div className="page-actions">
                    {/* Manual refresh is useful during demos after triggering failover */}
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
                    <div className="metric-extra">Under simulated load (k6, 5–10 RPS)</div>
                </div>

                <div className="metric-card">
                    <div className="metric-label">Failover Count</div>
                    <div className="metric-value">{metrics.failoverCount}</div>
                    <div className="metric-extra">
                        Triggered via MockPSP fault injection
                    </div>
                </div>
            </div>

            <div className="card" style={{marginTop: 14}}>
                <div className="card-header">
                    <span className="card-title">Error Distribution</span>
                    <span className="card-subtitle">
                        &nbsp;Simple breakdown by error type / provider.
                    </span>
                </div>

                {/* When empty, show a short message instead of an empty list */}
                {Object.keys(metrics.errorDistribution).length === 0 ? (
                    <p style={{fontSize: 15, color: "#9ca3af"}}>
                        No errors recorded in the current observation window.
                    </p>
                ) : (
                    <ul style={{fontSize: 15, color: "#e5e7eb"}}>
                        {/* Each entry is a counter label and its observed count */}
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