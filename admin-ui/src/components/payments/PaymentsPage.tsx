import React, { useEffect, useState } from "react";
import "../../App.css";
import {
    fetchPayments,
    type PaymentItem,
    type PaymentPage,
} from "../../api";

type PaymentsPageProps = {
    reloadKey: number;
    onNewPaymentClick: () => void;
    onViewRouting: (paymentId: string) => void;
};

// Amount cent cinsinden geliyo
function formatAmount(amount: number, currency: string) {
    const value = amount / 100;
    return new Intl.NumberFormat("en-IE", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleString();
}

export function PaymentsPage({
                                 reloadKey,
                                 onNewPaymentClick,
                                 onViewRouting,
                             }: PaymentsPageProps) {
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
                        {(() => {
                            if (!data || data.items.length === 0) {
                                return formatAmount(0, "EUR");
                            }

                            // currency -> totalCents map'i
                            const totalsByCurrency: Record<string, number> = {};

                            for (const p of data.items) {
                                totalsByCurrency[p.currency] =
                                    (totalsByCurrency[p.currency] ?? 0) + p.amount;
                            }

                            const entries = Object.entries(totalsByCurrency);

                            if (entries.length === 1) {
                                // Tek currency varsa eskisi gibi göster
                                const [currency, cents] = entries[0];
                                return formatAmount(cents, currency);
                            }

                            // Birden fazla currency: "€6.55 + £1.29" gibi
                            return entries
                                .map(([currency, cents]) => formatAmount(cents, currency))
                                .join(" + ");
                        })()}
                    </div>
                    <div className="kpi-trend">
                        {(() => {
                            if (!data || data.items.length === 0) {
                                return "No data yet";
                            }

                            const currencies = Array.from(
                                new Set(data.items.map((p) => p.currency))
                            );

                            if (currencies.length === 1) {
                                return `${data.items.length} payments on this page`;
                            }

                            // Örn: "10 payments in EUR, GBP"
                            return `${data.items.length} payments in ${currencies.join(", ")}`;
                        })()}
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
                            setStatusFilter(
                                e.target.value as "ALL" | "SUCCEEDED" | "FAILED" | "PENDING"
                            )
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
                        <div className="spinner" />
                    </div>
                )}
                {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}

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
                                                <td className="amount">
                                                    {formatAmount(p.amount, p.currency)}
                                                </td>
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
                    style={{ marginRight: 4 }}
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