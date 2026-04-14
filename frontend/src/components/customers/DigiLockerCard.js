import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Shield, CheckCircle, XCircle, Clock, CreditCard, Fingerprint, Loader2 } from "lucide-react";
import { getSecureItem } from "../../utils/secureStorage";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_CONFIG = {
  verified: { icon: CheckCircle, color: "#10b981", label: "Verified", bg: "rgba(16,185,129,0.08)" },
  failed: { icon: XCircle, color: "#ef4444", label: "Failed", bg: "rgba(239,68,68,0.08)" },
  not_verified: { icon: Clock, color: "#475569", label: "Not Verified", bg: "rgba(71,85,105,0.08)" },
  pending: { icon: Clock, color: "#f59e0b", label: "Pending", bg: "rgba(245,158,11,0.08)" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_verified;
  const Icon = cfg.icon;
  return (
    <span data-testid={`status-badge-${status}`} className="flex items-center gap-1" style={{
      fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "99px",
      background: cfg.bg, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.5px",
      border: `1px solid ${cfg.color}22`,
    }}>
      <Icon style={{ width: 11, height: 11 }} /> {cfg.label}
    </span>
  );
}

export function DigiLockerCard({ customerId, customerName }) {
  const [verifications, setVerifications] = useState({ aadhaar: {}, pan: {} });
  const [aadhaarInput, setAadhaarInput] = useState("");
  const [panInput, setPanInput] = useState("");
  const [verifyingAadhaar, setVerifyingAadhaar] = useState(false);
  const [verifyingPan, setVerifyingPan] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchVerifications = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/customers/${customerId}/verifications`, { withCredentials: true });
      setVerifications({ aadhaar: data.aadhaar || {}, pan: data.pan || {} });
    } catch (err) {
      // Silently fail for verification fetch — customer may not have verifications yet
    }
  }, [customerId]);

  useEffect(() => { fetchVerifications(); }, [fetchVerifications]);

  const handleVerifyAadhaar = async () => {
    if (!aadhaarInput.trim() || aadhaarInput.trim().length !== 12) {
      setMsg("Enter a valid 12-digit Aadhaar number");
      return;
    }
    setVerifyingAadhaar(true);
    setMsg("");
    try {
      const payload = { aadhaar_number: aadhaarInput.trim() };
      const localKey = getSecureItem("rudrik_digilocker_api_key");
      if (localKey) payload.api_key = localKey;

      const { data } = await axios.post(`${API}/customers/${customerId}/verify/aadhaar`, payload, { withCredentials: true });
      setVerifications((prev) => ({ ...prev, aadhaar: data }));
      setAadhaarInput("");
      setMsg(data.status === "verified" ? "Aadhaar verified successfully" : "Aadhaar verification failed");
    } catch (err) {
      setMsg(err.response?.data?.detail || "Verification failed");
    } finally {
      setVerifyingAadhaar(false);
    }
  };

  const handleVerifyPan = async () => {
    const cleaned = panInput.trim().toUpperCase();
    if (!cleaned || cleaned.length !== 10) {
      setMsg("Enter a valid 10-character PAN number");
      return;
    }
    setVerifyingPan(true);
    setMsg("");
    try {
      const payload = { pan_number: cleaned };
      const localKey = getSecureItem("rudrik_digilocker_api_key");
      if (localKey) payload.api_key = localKey;

      const { data } = await axios.post(`${API}/customers/${customerId}/verify/pan`, payload, { withCredentials: true });
      setVerifications((prev) => ({ ...prev, pan: data }));
      setPanInput("");
      setMsg(data.status === "verified" ? "PAN verified successfully" : "PAN verification failed");
    } catch (err) {
      setMsg(err.response?.data?.detail || "Verification failed");
    } finally {
      setVerifyingPan(false);
    }
  };

  const aadhaarStatus = verifications.aadhaar?.status || "not_verified";
  const panStatus = verifications.pan?.status || "not_verified";

  return (
    <div className="card-aml" data-testid="digilocker-verification-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield style={{ width: 16, height: 16, color: "#2563eb" }} />
          <h2 style={{ fontSize: "13px", fontWeight: 700, color: "#f1f5f9" }}>
            DigiLocker Verification
          </h2>
        </div>
        <span style={{
          fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: "4px",
          background: "rgba(37,99,235,0.1)", color: "#60a5fa", letterSpacing: "0.5px",
        }}>
          AADHAAR + PAN
        </span>
      </div>

      {msg && (
        <div data-testid="verification-msg" style={{
          padding: "8px 12px", borderRadius: "6px", marginBottom: "12px",
          fontSize: "12px", fontWeight: 600,
          background: msg.includes("successfully") ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
          color: msg.includes("successfully") ? "#10b981" : "#f59e0b",
          border: `1px solid ${msg.includes("successfully") ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
        }}>
          {msg}
        </div>
      )}

      {/* Aadhaar Verification */}
      <div style={{
        padding: "14px 16px", background: "#080c12", borderRadius: "8px",
        border: "1px solid #1e2530", marginBottom: "10px",
      }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Fingerprint style={{ width: 15, height: 15, color: "#f59e0b" }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9" }}>Aadhaar Card</span>
          </div>
          <StatusBadge status={aadhaarStatus} />
        </div>

        {aadhaarStatus === "verified" ? (
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "6px" }}>
            <span style={{ color: "#64748b" }}>Last 4: </span>
            <span style={{ fontWeight: 600, color: "#f1f5f9" }}>****{verifications.aadhaar.last4 || "****"}</span>
            {verifications.aadhaar.holder_name && (
              <span style={{ marginLeft: "12px" }}>
                <span style={{ color: "#64748b" }}>Name: </span>
                <span style={{ fontWeight: 600, color: "#f1f5f9" }}>{verifications.aadhaar.holder_name}</span>
              </span>
            )}
            {verifications.aadhaar.verified_at && (
              <div style={{ fontSize: "10px", color: "#475569", marginTop: "4px" }}>
                Verified {new Date(verifications.aadhaar.verified_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                {verifications.aadhaar.mode === "demo" && " (Demo)"}
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              maxLength={12}
              value={aadhaarInput}
              onChange={(e) => setAadhaarInput(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter 12-digit Aadhaar number"
              data-testid="aadhaar-input"
              className="input-aml flex-1"
              style={{ fontSize: "13px" }}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyAadhaar()}
            />
            <button onClick={handleVerifyAadhaar} disabled={verifyingAadhaar}
              data-testid="verify-aadhaar-btn"
              className="btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "4px", opacity: verifyingAadhaar ? 0.6 : 1, minWidth: "80px", justifyContent: "center" }}>
              {verifyingAadhaar ? <Loader2 className="w-3 h-3 animate-spin" /> : "Verify"}
            </button>
          </div>
        )}
      </div>

      {/* PAN Verification */}
      <div style={{
        padding: "14px 16px", background: "#080c12", borderRadius: "8px",
        border: "1px solid #1e2530",
      }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CreditCard style={{ width: 15, height: 15, color: "#2563eb" }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9" }}>PAN Card</span>
          </div>
          <StatusBadge status={panStatus} />
        </div>

        {panStatus === "verified" ? (
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "6px" }}>
            <span style={{ color: "#64748b" }}>PAN: </span>
            <span style={{ fontWeight: 600, color: "#f1f5f9", fontFamily: "monospace" }}>{verifications.pan.pan_number || "—"}</span>
            {verifications.pan.holder_name && (
              <span style={{ marginLeft: "12px" }}>
                <span style={{ color: "#64748b" }}>Name: </span>
                <span style={{ fontWeight: 600, color: "#f1f5f9" }}>{verifications.pan.holder_name}</span>
              </span>
            )}
            {verifications.pan.pan_type && (
              <span style={{ marginLeft: "12px" }}>
                <span style={{ color: "#64748b" }}>Type: </span>
                <span style={{ fontWeight: 500, color: "#94a3b8" }}>{verifications.pan.pan_type}</span>
              </span>
            )}
            {verifications.pan.name_match_score != null && (
              <span style={{ marginLeft: "12px" }}>
                <span style={{ color: "#64748b" }}>Match: </span>
                <span style={{ fontWeight: 700, color: verifications.pan.name_match_score >= 0.8 ? "#10b981" : "#f59e0b" }}>
                  {Math.round(verifications.pan.name_match_score * 100)}%
                </span>
              </span>
            )}
            {verifications.pan.verified_at && (
              <div style={{ fontSize: "10px", color: "#475569", marginTop: "4px" }}>
                Verified {new Date(verifications.pan.verified_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                {verifications.pan.mode === "demo" && " (Demo)"}
                {verifications.pan.aadhaar_linked != null && (
                  <span style={{ marginLeft: "8px", color: verifications.pan.aadhaar_linked ? "#10b981" : "#f59e0b" }}>
                    {verifications.pan.aadhaar_linked ? "Aadhaar Linked" : "Aadhaar Not Linked"}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              maxLength={10}
              value={panInput}
              onChange={(e) => setPanInput(e.target.value.toUpperCase())}
              placeholder="Enter 10-char PAN (e.g. ABCDE1234F)"
              data-testid="pan-input"
              className="input-aml flex-1"
              style={{ fontSize: "13px", fontFamily: "monospace" }}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyPan()}
            />
            <button onClick={handleVerifyPan} disabled={verifyingPan}
              data-testid="verify-pan-btn"
              className="btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "4px", opacity: verifyingPan ? 0.6 : 1, minWidth: "80px", justifyContent: "center" }}>
              {verifyingPan ? <Loader2 className="w-3 h-3 animate-spin" /> : "Verify"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
