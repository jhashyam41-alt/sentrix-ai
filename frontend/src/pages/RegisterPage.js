import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Shield, Mail, Lock, User, Building } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (password.length < 12) {
      setError("Password must be at least 12 characters long");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least one uppercase letter");
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError("Password must contain at least one number");
      return;
    }

    if (!/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) {
      setError("Password must contain at least one special character");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API}/auth/register`,
        {
          email,
          password,
          name,
          company_name: companyName,
          tenant_id: "default-tenant",
          role: "analyst"
        },
        { withCredentials: true }
      );

      // Auto-login after successful registration
      const loginResponse = await axios.post(
        `${API}/auth/login`,
        { email, password },
        { withCredentials: true }
      );

      if (loginResponse.data.access_token) {
        // Redirect to dashboard immediately
        navigate("/dashboard");
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map(e => e.msg || JSON.stringify(e)).join(" ")
        : String(detail || "Registration failed");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080c12" }}>
        <div className="w-full max-w-md">
          <div style={{
            background: "#0d1117",
            border: "1px solid #1e2530",
            borderRadius: "12px",
            padding: "32px",
            textAlign: "center"
          }}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                 style={{ background: "rgba(16, 185, 129, 0.2)" }}>
              <Shield className="w-8 h-8" style={{ color: "#10b981" }} />
            </div>
            <h2 style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "#f1f5f9",
              marginBottom: "12px"
            }}>Registration Successful!</h2>
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>
              Redirecting to login page...
            </p>
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
            }} data-testid="register-title">Create Account</h1>
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>
              Join AMLGuard Compliance Platform
            </p>
          </div>

          <form onSubmit={handleRegister}>
            <div className="mb-4">
              <label style={{
                fontSize: "13px",
                fontWeight: "700",
                color: "#f1f5f9",
                marginBottom: "8px",
                display: "block"
              }}>Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: "#475569" }} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full"
                  style={{
                    background: "#080c12",
                    border: "1px solid #1e2530",
                    borderRadius: "8px",
                    padding: "10px 14px 10px 42px",
                    color: "#f1f5f9",
                    fontSize: "14px"
                  }}
                  data-testid="name-input"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label style={{
                fontSize: "13px",
                fontWeight: "700",
                color: "#f1f5f9",
                marginBottom: "8px",
                display: "block"
              }}>Company Name</label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: "#475569" }} />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Sentrix AI"
                  className="w-full"
                  style={{
                    background: "#080c12",
                    border: "1px solid #1e2530",
                    borderRadius: "8px",
                    padding: "10px 14px 10px 42px",
                    color: "#f1f5f9",
                    fontSize: "14px"
                  }}
                  data-testid="company-input"
                  required
                />
              </div>
            </div>

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
                  placeholder="you@company.com"
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

            <div className="mb-4">
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
                  placeholder="Min 12 chars, uppercase, number, symbol"
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
              <p style={{
                fontSize: "11px",
                color: "#475569",
                marginTop: "6px"
              }}>
                Must include uppercase, number, and special character
              </p>
            </div>

            <div className="mb-6">
              <label style={{
                fontSize: "13px",
                fontWeight: "700",
                color: "#f1f5f9",
                marginBottom: "8px",
                display: "block"
              }}>Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: "#475569" }} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full"
                  style={{
                    background: "#080c12",
                    border: "1px solid #1e2530",
                    borderRadius: "8px",
                    padding: "10px 14px 10px 42px",
                    color: "#f1f5f9",
                    fontSize: "14px"
                  }}
                  data-testid="confirm-password-input"
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
              data-testid="register-button"
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
                fontSize: "14px",
                marginBottom: "16px"
              }}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

            <div style={{ textAlign: "center" }}>
              <span style={{ color: "#94a3b8", fontSize: "14px" }}>
                Already have an account?{" "}
              </span>
              <Link
                to="/login"
                data-testid="login-link"
                style={{
                  color: "#2563eb",
                  fontSize: "14px",
                  fontWeight: "600",
                  textDecoration: "none"
                }}
              >
                Sign In
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
