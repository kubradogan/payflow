import React from "react";
import "../../App.css";

// Allowed navigation tabs in the admin UI
export type Tab = "payments" | "providers" | "metrics";

// Centralised tab identifiers to avoid string duplication
const PAGES = {
    PAYMENTS: "payments" as Tab,
    PROVIDERS: "providers" as Tab,
    METRICS: "metrics" as Tab,
};

type SidebarProps = {
    active: Tab;
    onChange: (tab: Tab) => void;
};

export function Sidebar({active, onChange}: SidebarProps) {
    return (
        <aside className="app-sidebar">
            <div>
                {/* Primary navigation section */}
                <div className="sidebar-section-title">Navigation</div>
                <nav className="sidebar-nav">
                    {/*
                        Payments icon:
                        Commerce and shopping icons created by Arfianta - Flaticon
                        https://www.flaticon.com/free-icons/commerce-and-shopping
                    */}
                    <button
                        className={"sidebar-item " + (active === PAGES.PAYMENTS ? "active" : "")}
                        onClick={() => onChange(PAGES.PAYMENTS)}
                    >
                        <img
                            src={`${process.env.PUBLIC_URL}/icons/payments.png`}
                            alt="Payments"
                            className="icon-img"
                        />
                        <span className="text">Payments</span>
                    </button>

                    {/*
                        Providers icon:
                        Bank icons created by kmg design - Flaticon
                        https://www.flaticon.com/free-icons/bank
                    */}
                    <button
                        className={"sidebar-item " + (active === PAGES.PROVIDERS ? "active" : "")}
                        onClick={() => onChange(PAGES.PROVIDERS)}
                    >
                        <img
                            src={`${process.env.PUBLIC_URL}/icons/providers.png`}
                            alt="Providers"
                            className="icon-img"
                        />
                        <span className="text">Providers</span>
                    </button>

                    {/*
                        Metrics icon:
                        Metric icons created by everyday icon - Flaticon
                        https://www.flaticon.com/free-icons/metric
                    */}
                    <button
                        className={"sidebar-item " + (active === PAGES.METRICS ? "active" : "")}
                        onClick={() => onChange(PAGES.METRICS)}
                    >
                        <img
                            src={`${process.env.PUBLIC_URL}/icons/metrics.png`}
                            alt="Metrics"
                            className="icon-img"
                        />
                        <span className="text">Metrics</span>
                    </button>
                </nav>
            </div>

            {/* Informational footer section */}
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
                    intelligent routing and automatic failover
                </span>
            </div>
        </aside>
    );
}