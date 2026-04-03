import React, { useState } from "react";
import { X, CheckCircle, AlertTriangle, XCircle, Copy } from "lucide-react";

const RESOLUTION_TYPES = [
  { value: "true_match_sar_filed", label: "True Match — SAR Filed", icon: AlertTriangle, color: "#ef4444", desc: "Confirmed match. Suspicious Activity Report will be filed." },
  { value: "true_match_risk_accepted", label: "True Match — Risk Accepted", icon: CheckCircle, color: "#f59e0b", desc: "Confirmed match. Risk acknowledged and accepted with controls." },
  { value: "false_positive", label: "False Positive", icon: XCircle, color: "#10b981", desc: "Investigation determined this is not a genuine match." },
  { value: "duplicate", label: "Duplicate", icon: Copy, color: "#94a3b8", desc: "This case is a duplicate of an existing investigation." },
];

export function ResolutionModal({ caseData, onConfirm, onCancel, loading }) {
  const [selected, setSelected] = useState(null);

  return (
    <div
      data-testid="resolution-modal-overlay"
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, backdropFilter: "blur(4px)",
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid="resolution-modal"
        style={{
          background: "#0d1117", border: "1px solid #1e2530", borderRadius: "16px",
          padding: "28px", width: "480px", maxWidth: "90vw",
          animation: "caseModalFadeIn 0.2s ease",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#f1f5f9" }}>Resolve Case</h3>
            <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
              {caseData?.case_id} — {caseData?.customer_name}
            </p>
          </div>
          <button
            onClick={onCancel}
            data-testid="resolution-modal-close"
            style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
          >
            <X style={{ width: "18px", height: "18px" }} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
          {RESOLUTION_TYPES.map((rt) => {
            const Icon = rt.icon;
            const isSelected = selected === rt.value;
            return (
              <button
                key={rt.value}
                data-testid={`resolution-option-${rt.value}`}
                onClick={() => setSelected(rt.value)}
                style={{
                  background: isSelected ? "rgba(37, 99, 235, 0.1)" : "#080c12",
                  border: `1px solid ${isSelected ? "#2563eb" : "#1e2530"}`,
                  borderRadius: "10px", padding: "14px 16px",
                  cursor: "pointer", textAlign: "left", transition: "all 0.15s ease",
                  display: "flex", alignItems: "flex-start", gap: "12px",
                }}
              >
                <Icon style={{ width: "18px", height: "18px", color: rt.color, marginTop: "1px", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9" }}>{rt.label}</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{rt.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            data-testid="resolution-cancel-btn"
            style={{
              flex: 1, background: "transparent", border: "1px solid #1e2530",
              borderRadius: "8px", padding: "10px", color: "#94a3b8", fontSize: "13px",
              fontWeight: "600", cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected || loading}
            data-testid="resolution-confirm-btn"
            style={{
              flex: 1,
              background: selected ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "#1e2530",
              border: "none", borderRadius: "8px", padding: "10px",
              color: selected ? "#ffffff" : "#475569", fontSize: "13px",
              fontWeight: "600", cursor: selected ? "pointer" : "not-allowed",
            }}
          >
            {loading ? "Resolving..." : "Confirm Resolution"}
          </button>
        </div>
      </div>
    </div>
  );
}
