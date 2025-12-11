import React from "react";
import "../../App.css";

type TopbarProps = {
    onLogout: () => void;
};

export function Topbar({onLogout}: TopbarProps) {
    return (
        <header className="app-topbar">
            <div className="app-topbar-left">
                <div className="topbar-title">
                    <span className="topbar-title-main">PayFlow – Admin</span>
                    <span className="topbar-title-sub">
            Real-time payment orchestration control panel
          </span>
                </div>
            </div>
            <div className="app-topbar-right">
                <span className="logged-in-chip">Logged in as admin</span>
                <button className="btn-logout" onClick={onLogout}>
                    Logout
                </button>
            </div>
        </header>
    );
}