import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [tempToken, setTempToken] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, verify2FA } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.totp_required) {
        setTempToken(result.temp_token);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await verify2FA(totpToken, tempToken);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (tempToken) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080c12" }}>
        <div className="w-full max-w-md">
          <div style={{
            background: "#0d1117",
            border: "1px solid #1e2530",
            borderRadius: "12px",
            padding: "32px"
          }}>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                   style={{ background: "rgba(37, 99, 235, 0.2)" }}>
                <Lock className="w-8 h-8" style={{ color: "#2563eb" }} />
              </div>
              <h1 style={{
                fontSize: "26px",
                fontWeight: "700",
                letterSpacing: "-0.5px",
                color: "#f1f5f9",
                marginBottom: "8px"
              }}>Two-Factor Authentication</h1>
              <p style={{ color: "#94a3b8", fontSize: "14px" }}>
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <form onSubmit={handle2FAVerify}>
              <div className="mb-4">
                <label style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#f1f5f9",
                  marginBottom: "8px",
                  display: "block"
                }}>Verification Code</label>
                <input
                  type="text"
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value)}
                  maxLength={6}
                  placeholder="000000"
                  className="w-full"
                  style={{
                    background: "#080c12",
                    border: "1px solid #1e2530",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    color: "#f1f5f9",
                    fontSize: "14px"
                  }}
                  data-testid="2fa-token-input"
                  required
                />
              </div>

              {error && (
                <div style={{
                  background: "rgba(239, 68, 68, 0.18)",
                  color: "#ef4444",
                  padding: "12px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  fontSize: "13px"
                }} data-testid="error-message">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                data-testid="verify-2fa-button"
                className="w-full"
                style={{
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
                  color: "#ffffff",
                  fontWeight: "600",
                  padding: "12px",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "14px"
                }}
              >
                {loading ? "Verifying..." : "Verify & Login"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#080c12" }}>
      <div className="w-full max-w-md">
        <div style={{
          background: "#0d1117",
          border: "1px solid #1e2530",
          borderRadius: "12px",
          padding: "32px"
        }}>
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                 style={{ background: "rgba(37, 99, 235, 0.2)" }}>
              <Shield className="w-8 h-8" style={{ color: "#2563eb" }} />
            </div>
            <h1 style={{
              fontSize: "26px",
              fontWeight: "700",
              letterSpacing: "-0.5px",
              color: "#f1f5f9",
              marginBottom: "8px"
            }} data-testid="login-title">AMLGuard</h1>
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>
              Compliance & Risk Management Platform
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label style={{
                fontSize: "13px",
                fontWeight: "700",
                color: "#f1f5f9",
                marginBottom: "8px",
                display: "block"
              }}>Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: "#475569" }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@amlguard.com"
                  className="w-full"
                  style={{
                    background: "#080c12",
                    border: "1px solid #1e2530",
                    borderRadius: "8px",
                    padding: "10px 14px 10px 42px",
                    color: "#f1f5f9",
                    fontSize: "14px"
                  }}
                  data-testid="email-input"
                  required
                />
              </div>
            </div>

            <div className="mb-6">
              <label style={{
                fontSize: "13px",
                fontWeight: "700",
                color: "#f1f5f9",
                marginBottom: "8px",
                display: "block"
              }}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: "#475569" }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full"
                  style={{
                    background: "#080c12",
                    border: "1px solid #1e2530",
                    borderRadius: "8px",
                    padding: "10px 14px 10px 42px",
                    color: "#f1f5f9",
                    fontSize: "14px"
                  }}
                  data-testid="password-input"
                  required
                />
              </div>
            </div>

            {error && (
              <div style={{
                background: "rgba(239, 68, 68, 0.18)",
                color: "#ef4444",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "16px",
                fontSize: "13px"
              }} data-testid="error-message">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              data-testid="login-button"
              className="w-full"
              style={{
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
                color: "#ffffff",
                fontWeight: "600",
                padding: "12px",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "14px"
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
