import React from "react";
import "../../App.css";
import {PaymentDecision} from "../../api";

type RoutingModalStateLike = {
    paymentId: string;

    // Routing audit entries fetched from /admin/payments/{id}/decisions
    decisions: PaymentDecision[];

    // Simple UI state for async fetch
    loading: boolean;
    error: string | null;
} | null;

type RoutingDecisionsModalProps = {
    // Null means the modal is closed
    state: RoutingModalStateLike;

    // Parent controls closing the modal
    onClose: () => void;
};

function prettifyReason(reason: string): string {
    // Normalizes floating numbers inside reason strings for cleaner display in the UI
    // Example: score=0.9596000000000001 -> score=0.960
    // Example: failover:score=0.48000000000000004 -> failover:score=0.480
    return reason.replace(
        /(score[=:])([0-9]+\.[0-9]+)/g,
        (_, prefix: string, num: string) => {
            const n = Number(num);
            if (Number.isNaN(n)) {
                return `${prefix}${num}`;
            }
            return `${prefix}${n.toFixed(3)}`;
        }
    );
}

export function RoutingDecisionsModal({state, onClose}: RoutingDecisionsModalProps) {
    // Modal is not rendered unless the parent provides a state object
    if (!state) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal routing-modal">
                <div className="modal-header">
                    <div className="modal-title">
                        Routing decisions for {state.paymentId}
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
                            No routing decisions recorded for this payment
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
                                    <td>{prettifyReason(d.reason)}</td>
                                    <td>{new Date(d.decidedAt).toLocaleString()}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn-ghost" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}