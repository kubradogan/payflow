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


/* ROOT APP */

function App() {
    const [loggedIn, setLoggedIn] = useState<boolean>(() => hasAuthToken());
    const [activeTab, setActiveTab] = useState<Tab>("payments");
    const [showNewPayment, setShowNewPayment] = useState(false);
    const [paymentsReloadKey, setPaymentsReloadKey] = useState(0);
    const [toast, setToast] = useState<ToastState>(null);
    const [resultModal, setResultModal] = useState<ToastState | null>(null);
    const [routingModal, setRoutingModal] = useState<RoutingModalState>(null);

    // Providers vb. için klasik toast
    const notifyToast = (message: string, type: "success" | "error" = "success") => {
        setToast({type, message});
        setTimeout(() => {
            setToast(prev => (prev && prev.message === message ? null : prev));
        }, 5000);
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