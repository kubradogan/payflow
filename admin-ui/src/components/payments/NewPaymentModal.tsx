import React, { useState } from "react";
import "../../App.css";
import { createPayment } from "../../api";

type NewPaymentModalProps = {
    onClose: () => void;
    onCreated: () => void;
    notify: (msg: string, type?: "success" | "error") => void;
};

export function NewPaymentModal({
                                    onClose,
                                    onCreated,
                                    notify,
                                }: NewPaymentModalProps) {
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
                            <input value={idem} onChange={(e) => setIdem(e.target.value)} />
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