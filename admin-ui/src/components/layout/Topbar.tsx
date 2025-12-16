import React from "react";
import "../../App.css";

type TopbarProps = {
    onLogout: () => void;
};

export function Topbar({onLogout}: TopbarProps) {
    return (
        <header className="app-topbar">
            <div className="app-topbar-left">
                {/* Application title and short description */}
                <div className="topbar-title">
                    <span className="topbar-title-main">PayFlow – Admin</span>
                    <span className="topbar-title-sub">
                        Real-time payment orchestration control panel
                    </span>
                </div>
            </div>

            <div className="app-topbar-right">
                {/* Indicates the currently authenticated user */}
                <span className="logged-in-chip">Logged in as admin</span>

                {/* Triggers logout and credential cleanup */}
                <button className="btn-logout" onClick={onLogout}>
                    Logout
                </button>
            </div>
        </header>
    );
}