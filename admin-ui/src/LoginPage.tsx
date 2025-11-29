import React, {useState} from "react";
import {setCredentials, fetchPayments} from "./api";

type LoginPageProps = {
    onLoginSuccess: () => void;
};

const LoginPage: React.FC<LoginPageProps> = ({onLoginSuccess}) => {
    const [username, setUsername] = useState("admin");
    const [password, setPassword] = useState("admin123");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // FE tarafında basic tokenı set et
            setCredentials(username, password);

            // Doğru mu test etmek için küçük bir call
            await fetchPayments();

            onLoginSuccess();
        } catch (err) {
            setError("Invalid credentials or server error.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                maxWidth: 400,
                margin: "80px auto",
                border: "1px solid #ddd",
                padding: 24,
                borderRadius: 8,
            }}
        >
            <h2 style={{marginBottom: 16}}>PayFlow Admin Login</h2>
            <form onSubmit={handleSubmit}>
                <div style={{marginBottom: 12}}>
                    <label>
                        Username
                        <input
                            style={{width: "100%", padding: 8, marginTop: 4}}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </label>
                </div>

                <div style={{marginBottom: 12}}>
                    <label>
                        Password
                        <input
                            style={{width: "100%", padding: 8, marginTop: 4}}
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </label>
                </div>

                {error && (
                    <div style={{color: "red", marginBottom: 8}}>
                        {error}
                    </div>
                )}

                <button type="submit" disabled={loading} style={{padding: "8px 16px"}}>
                    {loading ? "Logging in..." : "Login"}
                </button>
            </form>
        </div>
    );
};

export default LoginPage;