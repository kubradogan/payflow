import React, {useState} from "react";
import "./App.css";
import "./providers.css";
import "./metrics.css";
import {Topbar} from "./components/layout/Topbar";
import {Sidebar} from "./components/layout/Sidebar";
import {PaymentsPage} from "./components/payments/PaymentsPage";
import {ProvidersPage} from "./components/providers/ProvidersPage";
import {MetricsPage} from "./components/metrics/MetricsPage";
import {LoginView} from "./components/auth/LoginView";
import {Toast} from "./components/common/Toast";
import {NewPaymentModal} from "./components/payments/NewPaymentModal";
import {MessageModal} from "./components/payments/MessageModal";
import {RoutingDecisionsModal} from "./components/payments/RoutingDecisionsModal";

import {
    hasAuthToken,
    clearCredentials,
    fetchPaymentDecisions,
    PaymentDecision
} from "./api";

// Tab names used by the sidebar and conditional rendering
type Tab = "payments" | "providers" | "metrics";

// Shared UI feedback type for toast and result modal
type ToastState = {
    type: "success" | "error";
    message: string;
} | null;

// Local state for the routing decisions modal
type RoutingModalState = {
    paymentId: string;
    decisions: PaymentDecision[];
    loading: boolean;
    error: string | null;
} | null;

function App() {
    // Persisted login state based on stored Basic Auth token
    const [loggedIn, setLoggedIn] = useState<boolean>(() => hasAuthToken());

    // Current page selected in the sidebar
    const [activeTab, setActiveTab] = useState<Tab>("payments");

    // Modal visibility and reload triggers for the payments table
    const [showNewPayment, setShowNewPayment] = useState(false);
    const [paymentsReloadKey, setPaymentsReloadKey] = useState(0);

    // Lightweight toast for small feedback messages
    const [toast, setToast] = useState<ToastState>(null);

    // Larger modal used to show the created payment result details
    const [resultModal, setResultModal] = useState<ToastState | null>(null);

    // Routing history modal state (lazy-loaded from backend on demand)
    const [routingModal, setRoutingModal] = useState<RoutingModalState>(null);

    // Small non-blocking toast notification (auto-hides)
    const notifyToast = (
        message: string,
        type: "success" | "error" = "success"
    ) => {
        setToast({type, message});

        // Keep the toast stable if another message replaces it before timeout
        setTimeout(() => {
            setToast((prev) => (prev && prev.message === message ? null : prev));
        }, 5000);
    };

    // Modalbased notification for the "new payment" flow
    const notifyResultModal = (
        message: string,
        type: "success" | "error" = "success"
    ) => {
        setResultModal({type, message});
    };

    // Opens the routing decisions modal and fetches the decision history for a payment
    const openRoutingModal = async (paymentId: string) => {
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

    // Closes the routing decisions modal and clears its state
    const closeRoutingModal = () => {
        setRoutingModal(null);
    };

    // Clears stored credentials and returns the user to the login screen
    const handleLogout = () => {
        clearCredentials();
        setLoggedIn(false);
    };

    // Gate the entire admin UI behind Basic Auth login
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

                {activeTab === "providers" && <ProvidersPage notify={notifyToast}/>}

                {activeTab === "metrics" && <MetricsPage/>}
            </main>

            {showNewPayment && (
                <NewPaymentModal
                    onClose={() => setShowNewPayment(false)}
                    // Increments the key so PaymentsPage reloads after a successful create
                    onCreated={() => setPaymentsReloadKey((k) => k + 1)}
                    notify={notifyResultModal}
                />
            )}

            <Toast toast={toast}/>

            {resultModal && (
                <MessageModal
                    type={resultModal.type}
                    message={resultModal.message}
                    onClose={() => setResultModal(null)}
                />
            )}

            {routingModal && (
                <RoutingDecisionsModal state={routingModal} onClose={closeRoutingModal}/>
            )}
        </div>
    );
}

export default App;