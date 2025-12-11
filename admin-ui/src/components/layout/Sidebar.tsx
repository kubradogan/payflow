import React from "react";
import "../../App.css";

export type Tab = "payments" | "providers" | "metrics";

const PAGES = {
    PAYMENTS: "payments" as Tab,
    PROVIDERS: "providers" as Tab,
    METRICS: "metrics" as Tab,
};

type SidebarProps = {
    active: Tab;
    onChange: (tab: Tab) => void;
};

export function Sidebar({ active, onChange }: SidebarProps) {
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
                <span style={{ fontSize: 15 }}>
          Built as a resilient multi-PSP payment orchestration layer with
          intelligent routing and automatic failover.
        </span>
            </div>
        </aside>
    );
}