import React from "react";
import { Eye, RefreshCw, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { RiskLevelBadge } from "./RiskScoreCircle";
import { riskScoreColor } from "../../utils/styleHelpers";

const CHECK_LABELS = { kyc: "KYC", sanctions: "SAN", pep: "PEP", adverse_media: "AM" };

const SLA_STYLES = {
  on_time: { color: "#10b981", bg: "rgba(16,185,129,0.12)", label: "On Time" },
  at_risk: { color: "#FFD700", bg: "rgba(255,215,0,0.1)", label: "At Risk" },
  breached: { color: "#8B0000", bg: "rgba(139,0,0,0.15)", label: "Breached" },
  pending: { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", label: "Pending" },
  unknown: { color: "#475569", bg: "rgba(71,85,105,0.1)", label: "—" },
};

export function ScreeningHistoryTable({ screenings, total, page, pages, onPageChange, onView, onRescreen, loading }) {
  if (loading) {
    return (
      <div className="card-aml" style={{ padding: "60px", textAlign: "center" }}>
        <div style={{ color: "#475569" }}>Loading screening records...</div>
      </div>
    );
  }

  return (
    <div className="card-aml" data-testid="screening-history-table" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "18px 24px", borderBottom: "1px solid #1e2530" }}>
        <div className="flex items-center justify-between">
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#f1f5f9" }}>
            Screening History
          </h2>
          <span style={{ fontSize: "12px", color: "#475569" }}>{total} records</span>
        </div>
      </div>

      {screenings.length === 0 ? (
        <div style={{ padding: "60px", textAlign: "center", color: "#475569" }}>
          No screening records yet
        </div>
      ) : (
        <>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 0.8fr 1fr 1.2fr 1fr 0.8fr 0.8fr 1fr",
            gap: "8px",
            padding: "12px 24px",
            background: "#080c12",
            borderBottom: "1px solid #1e2530",
            fontSize: "10px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "1.5px",
            color: "#475569",
          }}>
            <span>Name</span>
            <span>ID Type</span>
            <span>Score</span>
            <span>Risk Level</span>
            <span>Checks</span>
            <span>Date</span>
            <span>Status</span>
            <span>SLA</span>
            <span>Actions</span>
          </div>

          {/* Rows */}
          {screenings.map((s) => (
            <div key={s.id} data-testid={`screening-row-${s.id}`} style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 0.8fr 1fr 1.2fr 1fr 0.8fr 0.8fr 1fr",
              gap: "8px",
              padding: "14px 24px",
              borderBottom: "1px solid #0f1520",
              alignItems: "center",
              transition: "background 0.15s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#0f1520"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {s.full_name}
                </div>
                <div style={{ fontSize: "11px", color: "#475569" }}>{s.nationality || "—"}</div>
              </div>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>{s.id_type || "—"}</span>
              <span style={{
                fontSize: "14px", fontWeight: 700,
                color: riskScoreColor(s.risk_score),
              }}>
                {s.risk_score}
              </span>
              <div><RiskLevelBadge level={s.risk_level} /></div>
              <div className="flex gap-1 flex-wrap">
                {(s.checks_run || []).map((c) => (
                  <span key={c} style={{
                    fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "3px",
                    background: "rgba(37,99,235,0.12)", color: "#60a5fa", textTransform: "uppercase",
                  }}>
                    {CHECK_LABELS[c] || c}
                  </span>
                ))}
              </div>
              <span style={{ fontSize: "12px", color: "#475569" }}>
                {new Date(s.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
              <span style={{
                fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "4px",
                textTransform: "uppercase",
                color: s.status === "flagged" ? "#ef4444" : "#10b981",
                background: s.status === "flagged" ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
              }}>
                {s.status}
              </span>
              {/* SLA Status Column */}
              {(() => {
                const sla = SLA_STYLES[s.sla_status] || SLA_STYLES.unknown;
                return (
                  <div data-testid={`sla-status-${s.id}`} className="flex items-center gap-1" title={s.sla_elapsed_hrs ? `${s.sla_elapsed_hrs}h elapsed` : ""}>
                    <Clock style={{ width: "10px", height: "10px", color: sla.color }} />
                    <span style={{
                      fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "3px",
                      background: sla.bg, color: sla.color, textTransform: "uppercase",
                    }}>
                      {sla.label}
                    </span>
                  </div>
                );
              })()}
              <div className="flex gap-2">
                <button onClick={() => onView(s)} data-testid={`view-screening-${s.id}`}
                  title="View details"
                  style={{
                    background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.25)",
                    borderRadius: "6px", padding: "5px 8px", cursor: "pointer", color: "#60a5fa",
                    display: "flex", alignItems: "center", gap: "4px", fontSize: "11px",
                  }}>
                  <Eye className="w-3 h-3" /> View
                </button>
                <button onClick={() => onRescreen(s)} data-testid={`rescreen-${s.id}`}
                  title="Re-screen"
                  style={{
                    background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
                    borderRadius: "6px", padding: "5px 8px", cursor: "pointer", color: "#f59e0b",
                    display: "flex", alignItems: "center", gap: "4px", fontSize: "11px",
                  }}>
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between" style={{ padding: "14px 24px", borderTop: "1px solid #1e2530" }}>
              <span style={{ fontSize: "12px", color: "#475569" }}>
                Page {page} of {pages}
              </span>
              <div className="flex gap-2">
                <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
                  style={{
                    background: "#080c12", border: "1px solid #1e2530", borderRadius: "6px",
                    padding: "6px 10px", cursor: page <= 1 ? "not-allowed" : "pointer",
                    opacity: page <= 1 ? 0.4 : 1, color: "#94a3b8",
                  }}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => onPageChange(page + 1)} disabled={page >= pages}
                  style={{
                    background: "#080c12", border: "1px solid #1e2530", borderRadius: "6px",
                    padding: "6px 10px", cursor: page >= pages ? "not-allowed" : "pointer",
                    opacity: page >= pages ? 0.4 : 1, color: "#94a3b8",
                  }}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
