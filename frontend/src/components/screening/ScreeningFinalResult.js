import React from "react";
import { CheckCircle, XCircle, AlertTriangle, FileWarning, FolderOpen, Globe, Shield } from "lucide-react";
import { RiskScoreCircle, RiskLevelBadge } from "./RiskScoreCircle";

const MATCH_TYPE_COLORS = {
  sanction: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)", text: "#ef4444" },
  pep: { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", text: "#f59e0b" },
  "adverse-media": { bg: "rgba(168,85,247,0.1)", border: "rgba(168,85,247,0.25)", text: "#a855f7" },
  criminal: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)", text: "#ef4444" },
};

function MatchTypeBadge({ type }) {
  const colors = MATCH_TYPE_COLORS[type] || { bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.25)", text: "#94a3b8" };
  const label = (type || "unknown").replace("-", " ").replace("_", " ");
  return (
    <span style={{
      fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: "4px",
      background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text,
      textTransform: "uppercase", letterSpacing: "0.5px",
    }}>{label}</span>
  );
}

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
  const isLive = result.mode === "live";

  return (
    <div style={{
      background: "#0d1117", border: "1px solid #1e2530", borderRadius: "12px",
      padding: "24px", marginBottom: "24px",
    }} data-testid="screening-result-card">
      <div className="flex items-center justify-between mb-5">
        <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: "#475569" }}>
          Screening Result
        </div>
        {/* Provider badge */}
        <div className="flex items-center gap-1.5" data-testid="screening-provider-badge" style={{
          padding: "3px 10px", borderRadius: "99px", fontSize: "10px", fontWeight: 700,
          background: isLive ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
          border: `1px solid ${isLive ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
          color: isLive ? "#10b981" : "#f59e0b",
        }}>
          <Shield style={{ width: 10, height: 10 }} />
          {isLive ? `Sanctions.io (${result.provider || "live"})` : "Demo Data"}
        </div>
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
            {result.nationality || "\u2014"} {result.id_type ? `\u2022 ${result.id_type}` : ""} {result.id_number ? `\u2022 ${result.id_number}` : ""}
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

      {/* Matched Entities — enhanced display */}
      {hasMatches && (
        <div style={{ marginBottom: "20px" }}>
          <div className="flex items-center gap-2 mb-3">
            <FileWarning style={{ width: 14, height: 14, color: "#ef4444" }} />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#ef4444" }}>
              Matched Entities ({result.matched_entities.length})
            </span>
          </div>
          <div className="space-y-2">
            {result.matched_entities.map((m, i) => (
              <div key={m.id || i} style={{
                padding: "12px 16px", background: "rgba(239,68,68,0.04)", borderRadius: "8px",
                border: "1px solid rgba(239,68,68,0.12)",
              }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9" }}>{m.caption}</span>
                    <MatchTypeBadge type={m.match_type || (m.topics?.[0])} />
                  </div>
                  <span style={{
                    fontSize: "12px", fontWeight: 700,
                    color: (m.score || 0) >= 0.7 ? "#ef4444" : (m.score || 0) >= 0.4 ? "#f59e0b" : "#94a3b8",
                  }}>
                    {Math.round((m.score || 0) * 100)}% match
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap" style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                  {m.list_source && (
                    <span className="flex items-center gap-1">
                      <Shield style={{ width: 10, height: 10 }} /> {m.list_source}
                    </span>
                  )}
                  {m.country && (
                    <span className="flex items-center gap-1">
                      <Globe style={{ width: 10, height: 10 }} /> {m.country}
                    </span>
                  )}
                  {!m.list_source && m.datasets?.length > 0 && (
                    <span>{m.datasets.join(", ")}</span>
                  )}
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
