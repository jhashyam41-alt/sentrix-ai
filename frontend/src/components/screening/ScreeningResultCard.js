import React from "react";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const RISK_COLORS = {
  LOW: "#10b981",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
  CRITICAL: "#dc2626",
};

export function ScreeningResultCard({ result }) {
  if (!result) return null;

  if (result.error) {
    return (
      <div className="card-aml" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle style={{ color: "#ef4444", width: 16, height: 16 }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#ef4444" }}>Error</span>
        </div>
        <p style={{ fontSize: "13px", color: "#94a3b8" }}>{result.error}</p>
      </div>
    );
  }

  const riskLevel = result.riskLevel || result.risk_level || "N/A";

  return (
    <div className="card-aml" data-testid="screening-result">
      <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#f1f5f9", marginBottom: "12px" }}>
        Result
      </h3>
      <div className="space-y-3">
        <div>
          <div style={{ fontSize: "11px", color: "#475569", marginBottom: "2px" }}>Risk Level</div>
          <span style={{ fontSize: "18px", fontWeight: 700, color: RISK_COLORS[riskLevel] || "#94a3b8" }}>
            {riskLevel}
          </span>
        </div>
        <CheckRow label="Sanctions" data={result.sanctions} />
        <CheckRow label="PEP" data={result.pep} />
        {result.kyc && (
          <CheckRow label="KYC" data={result.kyc} statusField="status" clearValue="verified" />
        )}
        <div style={{ fontSize: "11px", color: "#475569", borderTop: "1px solid #1e2530", paddingTop: "8px" }}>
          Mode: {result.mode || "demo"} {result.completedAt || result.screened_at
            ? `\u2022 ${new Date(result.completedAt || result.screened_at).toLocaleString()}`
            : ""}
        </div>
      </div>
    </div>
  );
}

function CheckRow({ label, data, statusField = "status", clearValue = "clear" }) {
  if (!data) return null;
  const status = data[statusField];
  const isClear = status === clearValue;

  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: "13px", color: "#94a3b8" }}>{label}</span>
      <span style={{
        display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 600,
        color: isClear ? "#10b981" : "#ef4444",
      }}>
        {isClear ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
        {status}
      </span>
    </div>
  );
}
