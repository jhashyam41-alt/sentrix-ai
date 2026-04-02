import React from "react";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const STATUS_CONFIG = {
  verified: { icon: CheckCircle, color: "#10b981", label: "Verified" },
  failed: { icon: XCircle, color: "#ef4444", label: "Failed" },
  error: { icon: AlertTriangle, color: "#f59e0b", label: "Error" },
};

export function KYCResultBanner({ result }) {
  if (!result) return null;

  const cfg = STATUS_CONFIG[result.status] || STATUS_CONFIG.error;

  return (
    <div
      data-testid="kyc-last-result"
      style={{
        background: `${cfg.color}14`,
        border: `1px solid ${cfg.color}33`,
        borderRadius: "8px",
        padding: "12px 16px",
        marginBottom: "16px",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <cfg.icon style={{ width: 16, height: 16, color: cfg.color }} />
        <span style={{ fontSize: "13px", fontWeight: 600, color: cfg.color }}>
          {cfg.label}
        </span>
      </div>
      {result.holder_name && (
        <div style={{ fontSize: "12px", color: "#94a3b8" }}>
          Name: <span style={{ color: "#f1f5f9" }}>{result.holder_name}</span>
        </div>
      )}
      {result.message && (
        <div style={{ fontSize: "12px", color: "#f59e0b" }}>{result.message}</div>
      )}
    </div>
  );
}

export function KYCVerificationHistory({ verifications, loading }) {
  return (
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
                      {v.id_number} {v.verified_at ? `\u2022 ${new Date(v.verified_at).toLocaleDateString()}` : ""}
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
  );
}
