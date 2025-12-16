import React, {useState} from "react";
import "../../App.css";
import {fetchMetrics, setCredentials, clearCredentials} from "../../api";

// Props used to notify parent component after successful login
type LoginProps = {
    onSuccess: () => void;
};

export function LoginView({onSuccess}: LoginProps) {

    // Holds admin username and password entered in the form
    const [username, setUsername] = useState("admin");
    const [password, setPassword] = useState("admin123");

    // Stores login error message if authentication fails
    const [error, setError] = useState<string | null>(null);

    // Controls loading state while login request is in progress
    const [loading, setLoading] = useState(false);

    // Handles form submission and basic authentication check
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Stores Basic Auth credentials for subsequent API calls
            setCredentials(username, password);

            // Simple authentication check by calling a protected endpoint
            await fetchMetrics();

            // Notify parent component that login was successful
            onSuccess();
        } catch (err) {
            // Reset credentials and show error if authentication fails
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

                {/* Short description shown on the login screen */}
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

                    {/* Displays authentication error message */}
                    {error && <p className="error">{error}</p>}

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                    >
                        {loading ? "Signing in…" : "Login"}
                    </button>
                </form>
            </div>
        </div>
    );
}