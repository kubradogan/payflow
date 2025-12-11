import React, { useState } from "react";
import "../../App.css";
import { fetchMetrics, setCredentials, clearCredentials } from "../../api";

type LoginProps = {
    onSuccess: () => void;
};

export function LoginView({ onSuccess }: LoginProps) {
    const [username, setUsername] = useState("admin");
    const [password, setPassword] = useState("admin123");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            setCredentials(username, password);
            // basit ping: metrics çek, auth doğru mu kontrol et
            await fetchMetrics();
            onSuccess();
        } catch (err) {
            setError("Invalid username or password");
            clearCredentials();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-root">
            <div className="login-card">
                <div className="login-title">PayFlow – Admin</div>
                <div className="login-sub">
                    Secure access to intelligent payment routing and live metrics.
                </div>
                <form className="login-form" onSubmit={handleSubmit}>
                    <label>
                        Username
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </label>
                    <label>
                        Password
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </label>
                    {error && <p className="error">{error}</p>}
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? "Signing in…" : "Login"}
                    </button>
                </form>
            </div>
        </div>
    );
}