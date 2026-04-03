import React from "react";
import { CheckCircle, XCircle, AlertTriangle, FileWarning, FolderOpen } from "lucide-react";
import { RiskScoreCircle, RiskLevelBadge } from "./RiskScoreCircle";

function CheckResult({ label, result, type }) {
  if (!result) return null;
  const isClear = result.status === "clear" || result.status === "verified";
  const Icon = isClear ? CheckCircle : XCircle;
  const color = isClear ? "#10b981" : "#ef4444";

  return (
    <div className="flex items-center justify-between" style={{
      padding: "10px 14px", background: "#080c12", borderRadius: "8px", border: "1px solid #1e2530",
    }} data-testid={`check-result-${type}`}>
      <div className="flex items-center gap-2">
        <Icon style={{ width: 15, height: 15, color }} />
        <span style={{ fontSize: "13px", color: "#f1f5f9", fontWeight: 500 }}>{label}</span>
      </div>
      <span style={{
        fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "5px",
        color, background: `${color}18`, textTransform: "uppercase",
      }}>
        {result.status}
      </span>
    </div>
  );
}

export function ScreeningResultCard({ result, onCreateCase }) {
  if (!result) return null;

  const hasMatches = (result.matched_entities || []).length > 0;
  const showCaseBtn = result.risk_level === "MEDIUM" || result.risk_level === "HIGH" || result.risk_level === "CRITICAL";

  return (
    <div style={{
      background: "#0d1117", border: "1px solid #1e2530", borderRadius: "12px",
      padding: "24px", marginBottom: "24px",
    }} data-testid="screening-result-card">
      <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: "#475569", marginBottom: "20px" }}>
        Screening Result
      </div>

      {/* Risk Score + Level */}
      <div className="flex items-center gap-8 mb-6" style={{ flexWrap: "wrap" }}>
        <RiskScoreCircle score={result.risk_score} level={result.risk_level} size={140} />
        <div>
          <div style={{ marginBottom: "8px" }}>
            <RiskLevelBadge level={result.risk_level} />
          </div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#f1f5f9", marginBottom: "4px" }}>
            {result.full_name}
          </div>
          <div style={{ fontSize: "12px", color: "#475569" }}>
            {result.nationality || "—"} {result.id_type ? `• ${result.id_type}` : ""} {result.id_number ? `• ${result.id_number}` : ""}
          </div>
          {result.country_risk && (
            <div className="flex items-center gap-1 mt-2">
              <AlertTriangle style={{ width: 13, height: 13, color: "#f59e0b" }} />
              <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 600 }}>FATF High-Risk Jurisdiction</span>
            </div>
          )}
        </div>
      </div>

      {/* Check Breakdown */}
      <div className="space-y-2 mb-5">
        <CheckResult label="KYC Verification" result={result.kyc_result} type="kyc" />
        <CheckResult label="Sanctions Check" result={result.sanctions_result} type="sanctions" />
        <CheckResult label="PEP Screening" result={result.pep_result} type="pep" />
        <CheckResult label="Adverse Media" result={result.adverse_media_result} type="adverse_media" />
      </div>

      {/* Matched Entities */}
      {hasMatches && (
        <div style={{ marginBottom: "20px" }}>
          <div className="flex items-center gap-2 mb-2">
            <FileWarning style={{ width: 14, height: 14, color: "#ef4444" }} />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#ef4444" }}>
              Matched Entities ({result.matched_entities.length})
            </span>
          </div>
          <div className="space-y-2">
            {result.matched_entities.map((m, i) => (
              <div key={m.id || i} style={{
                padding: "10px 14px", background: "rgba(239,68,68,0.06)", borderRadius: "8px",
                border: "1px solid rgba(239,68,68,0.15)",
              }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9" }}>{m.caption}</div>
                <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                  Score: {Math.round((m.score || 0) * 100)}%
                  {m.datasets?.length > 0 && ` • ${m.datasets.join(", ")}`}
                  {m.topics?.length > 0 && ` • ${m.topics.join(", ")}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Case Button */}
      {showCaseBtn && (
        <button onClick={onCreateCase} className="btn-primary"
          data-testid="create-case-from-screening"
          style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" , justifyContent: "center" }}>
          <FolderOpen className="w-4 h-4" /> Create Investigation Case
        </button>
      )}
    </div>
  );
}
