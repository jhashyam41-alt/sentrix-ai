import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ShieldCheck, Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DOC_TYPES = [
  { key: "pan", label: "PAN Card", field: "panNumber", placeholder: "ABCDE1234F" },
  { key: "aadhaar", label: "Aadhaar", field: "aadhaarNumber", placeholder: "123456789012" },
  { key: "passport", label: "Passport", field: "passportNumber", placeholder: "A1234567" },
  { key: "voter_id", label: "Voter ID", field: "voterIdNumber", placeholder: "ABC1234567" },
  { key: "driving_license", label: "Driving License", field: "dlNumber", placeholder: "KA0120201234567" },
];

const STATUS_CONFIG = {
  verified: { icon: CheckCircle, color: "#10b981", label: "Verified" },
  failed: { icon: XCircle, color: "#ef4444", label: "Failed" },
  error: { icon: AlertTriangle, color: "#f59e0b", label: "Error" },
};

export function KYCVerificationCard({ customerId, customerName }) {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState("pan");
  const [idNumber, setIdNumber] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const fetchVerifications = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/kyc/verifications/${customerId}`, {
        withCredentials: true,
      });
      setVerifications(data.verifications || []);
    } catch (err) {
      console.error("Failed to fetch KYC verifications:", err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  const runVerification = async () => {
    const docType = DOC_TYPES.find((d) => d.key === selectedDoc);
    if (!docType || !idNumber.trim()) return;

    setVerifying(true);
    setLastResult(null);
    try {
      const payload = { [docType.field]: idNumber.trim(), customerId };
      if (selectedDoc === "pan") payload.fullName = customerName || "";

      const endpoint = selectedDoc === "driving_license" ? "verify-driving-license"
        : selectedDoc === "voter_id" ? "verify-voter-id"
        : `verify-${selectedDoc}`;

      const { data } = await axios.post(`${API}/kyc/${endpoint}`, payload, {
        withCredentials: true,
      });
      setLastResult(data);
      setIdNumber("");
      await fetchVerifications();
    } catch (err) {
      const msg = err.response?.data?.detail || "Verification failed";
      setLastResult({ status: "error", message: msg });
    } finally {
      setVerifying(false);
    }
  };

  const currentDoc = DOC_TYPES.find((d) => d.key === selectedDoc);

  return (
    <div style={{
      background: "#0d1117",
      border: "1px solid #1e2530",
      borderRadius: "12px",
      padding: "24px",
      marginBottom: "24px",
    }} data-testid="kyc-verification-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck style={{ color: "#2563eb", width: 18, height: 18 }} />
          <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9" }}>
            KYC Document Verification
          </h2>
        </div>
        <span style={{
          fontSize: "10px",
          padding: "4px 8px",
          borderRadius: "4px",
          background: "rgba(37,99,235,0.15)",
          color: "#60a5fa",
          fontWeight: 600,
        }}>
          DEMO MODE
        </span>
      </div>

      {/* Verification form */}
      <div style={{
        background: "#080c12",
        border: "1px solid #1e2530",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "16px",
      }}>
        <div className="flex gap-3 mb-3 flex-wrap">
          {DOC_TYPES.map((doc) => (
            <button
              key={doc.key}
              onClick={() => { setSelectedDoc(doc.key); setIdNumber(""); setLastResult(null); }}
              data-testid={`kyc-tab-${doc.key}`}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                border: selectedDoc === doc.key ? "1px solid #2563eb" : "1px solid #1e2530",
                background: selectedDoc === doc.key ? "rgba(37,99,235,0.15)" : "transparent",
                color: selectedDoc === doc.key ? "#60a5fa" : "#94a3b8",
                transition: "all 0.2s",
              }}
            >
              {doc.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder={currentDoc?.placeholder || ""}
            data-testid="kyc-id-input"
            className="input-aml flex-1"
            style={{ fontSize: "14px" }}
            onKeyDown={(e) => e.key === "Enter" && runVerification()}
          />
          <button
            onClick={runVerification}
            disabled={verifying || !idNumber.trim()}
            data-testid="kyc-verify-btn"
            className="btn-primary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              opacity: verifying || !idNumber.trim() ? 0.5 : 1,
              minWidth: "100px",
              justifyContent: "center",
            }}
          >
            {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {verifying ? "Verifying..." : "Verify"}
          </button>
        </div>
      </div>

      {/* Last result */}
      {lastResult && (
        <div
          data-testid="kyc-last-result"
          style={{
            background: lastResult.status === "verified"
              ? "rgba(16,185,129,0.08)"
              : lastResult.status === "failed"
              ? "rgba(239,68,68,0.08)"
              : "rgba(245,158,11,0.08)",
            border: `1px solid ${
              lastResult.status === "verified" ? "#10b981" : lastResult.status === "failed" ? "#ef4444" : "#f59e0b"
            }33`,
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "16px",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            {(() => {
              const cfg = STATUS_CONFIG[lastResult.status] || STATUS_CONFIG.error;
              const Icon = cfg.icon;
              return <Icon style={{ width: 16, height: 16, color: cfg.color }} />;
            })()}
            <span style={{
              fontSize: "13px",
              fontWeight: 600,
              color: STATUS_CONFIG[lastResult.status]?.color || "#f59e0b",
            }}>
              {STATUS_CONFIG[lastResult.status]?.label || lastResult.status}
            </span>
          </div>
          {lastResult.holder_name && (
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>
              Name: <span style={{ color: "#f1f5f9" }}>{lastResult.holder_name}</span>
            </div>
          )}
          {lastResult.message && (
            <div style={{ fontSize: "12px", color: "#f59e0b" }}>{lastResult.message}</div>
          )}
        </div>
      )}

      {/* Verification history */}
      <div>
        <div style={{ fontSize: "11px", color: "#475569", marginBottom: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>
          Verification History
        </div>
        {loading ? (
          <div style={{ color: "#475569", fontSize: "13px", padding: "12px 0" }}>Loading...</div>
        ) : verifications.length === 0 ? (
          <div style={{ color: "#475569", fontSize: "13px", padding: "12px 0" }}>
            No verifications yet
          </div>
        ) : (
          <div className="space-y-2">
            {verifications.slice(0, 10).map((v) => {
              const cfg = STATUS_CONFIG[v.verification_status] || STATUS_CONFIG.error;
              const Icon = cfg.icon;
              return (
                <div
                  key={v.id}
                  className="flex items-center justify-between"
                  style={{
                    padding: "8px 12px",
                    background: "#080c12",
                    borderRadius: "6px",
                    border: "1px solid #1e2530",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Icon style={{ width: 14, height: 14, color: cfg.color }} />
                    <div>
                      <div style={{ fontSize: "13px", color: "#f1f5f9", fontWeight: 500 }}>
                        {v.verification_type?.replace("_", " ").toUpperCase()}
                      </div>
                      <div style={{ fontSize: "11px", color: "#475569" }}>
                        {v.id_number} • {new Date(v.verified_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "4px",
                    color: cfg.color,
                    background: `${cfg.color}22`,
                    textTransform: "uppercase",
                  }}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
