import React, { useState } from "react";
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";

const actionConfig = {
  screening_run: { label: "Screening Run", color: "#2563eb", bg: "rgba(37, 99, 235, 0.12)" },
  quick_screening_run: { label: "Screening Run", color: "#2563eb", bg: "rgba(37, 99, 235, 0.12)" },
  pep_screening_run: { label: "PEP Screening", color: "#2563eb", bg: "rgba(37, 99, 235, 0.12)" },
  adverse_media_screening_run: { label: "Adverse Media", color: "#2563eb", bg: "rgba(37, 99, 235, 0.12)" },
  case_created: { label: "Case Created", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" },
  case_resolved: { label: "Case Resolved", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)" },
  case_closed: { label: "Case Closed", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)" },
  case_updated: { label: "Case Updated", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" },
  case_status_changed: { label: "Status Changed", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" },
  case_note_added: { label: "Note Added", color: "#64748b", bg: "rgba(100, 116, 139, 0.12)" },
  case_escalated: { label: "Escalated", color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)" },
  case_assigned: { label: "Assigned", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" },
  api_key_created: { label: "API Key Generated", color: "#a855f7", bg: "rgba(168, 85, 247, 0.12)" },
  api_key_revoked: { label: "API Key Revoked", color: "#a855f7", bg: "rgba(168, 85, 247, 0.12)" },
  customer_created: { label: "Customer Added", color: "#14b8a6", bg: "rgba(20, 184, 166, 0.12)" },
  customer_updated: { label: "Customer Updated", color: "#14b8a6", bg: "rgba(20, 184, 166, 0.12)" },
  user_registered: { label: "User Registered", color: "#64748b", bg: "rgba(100, 116, 139, 0.12)" },
  user_login: { label: "Login", color: "#64748b", bg: "rgba(100, 116, 139, 0.12)" },
  totp_enabled: { label: "2FA Enabled", color: "#64748b", bg: "rgba(100, 116, 139, 0.12)" },
  sar_filed: { label: "SAR Filed", color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)" },
  sar_report_generated: { label: "SAR Generated", color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)" },
  settings_changed: { label: "Settings Changed", color: "#64748b", bg: "rgba(100, 116, 139, 0.12)" },
  cdd_status_updated: { label: "CDD Updated", color: "#14b8a6", bg: "rgba(20, 184, 166, 0.12)" },
  edd_checklist_updated: { label: "EDD Updated", color: "#14b8a6", bg: "rgba(20, 184, 166, 0.12)" },
  note_added: { label: "Note Added", color: "#64748b", bg: "rgba(100, 116, 139, 0.12)" },
  kyc_verification: { label: "KYC Verification", color: "#2563eb", bg: "rgba(37, 99, 235, 0.12)" },
  audit_log_exported: { label: "Log Exported", color: "#64748b", bg: "rgba(100, 116, 139, 0.12)" },
};

const defaultAction = { label: "Unknown", color: "#64748b", bg: "rgba(100, 116, 139, 0.12)" };

const HEADERS = ["Timestamp", "User", "Action", "Resource", "IP Address", "Details"];

export const AuditLogTable = ({ logs, loading, total, page, pageSize, hasActiveFilters, onPageChange }) => {
  const [expandedRow, setExpandedRow] = useState(null);
  const totalPages = Math.ceil(total / pageSize);

  const toggleRow = (id) => {
    setExpandedRow(prev => prev === id ? null : id);
  };

  return (
    <div style={{ background: "#0d1117", border: "1px solid #1e2530", borderRadius: "12px", overflow: "hidden" }}>
      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>Loading audit logs...</div>
      ) : logs.length === 0 ? (
        <div style={{ padding: "60px", textAlign: "center", color: "#475569" }}>
          <Search className="w-10 h-10 mx-auto mb-3" style={{ opacity: 0.4 }} />
          <p style={{ fontSize: "14px" }}>No audit log entries found</p>
          {hasActiveFilters && <p style={{ fontSize: "12px", marginTop: "4px" }}>Try adjusting your filters</p>}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }} data-testid="audit-log-table">
            <thead>
              <tr style={{ borderBottom: "1px solid #1a1f2e" }}>
                {HEADERS.map((h) => (
                  <th key={h} style={{
                    padding: "14px 16px", textAlign: "left", fontSize: "10px", fontWeight: "600",
                    textTransform: "uppercase", color: "#475569", letterSpacing: "1px", whiteSpace: "nowrap"
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => {
                const ac = actionConfig[log.action_type] || defaultAction;
                const isExpanded = expandedRow === (log.id || idx);
                const hasDetails = log.details && Object.keys(log.details).length > 0;

                return (
                  <React.Fragment key={log.id || idx}>
                    <tr
                      data-testid={`audit-row-${idx}`}
                      onClick={() => hasDetails && toggleRow(log.id || idx)}
                      style={{
                        borderBottom: isExpanded ? "none" : (idx < logs.length - 1 ? "1px solid #0f1520" : "none"),
                        cursor: hasDetails ? "pointer" : "default",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#131923"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                        <div style={{ color: "#94a3b8", fontSize: "13px" }}>{new Date(log.timestamp).toLocaleDateString()}</div>
                        <div style={{ color: "#475569", fontSize: "11px" }}>{new Date(log.timestamp).toLocaleTimeString()}</div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ color: "#f1f5f9", fontSize: "13px", fontWeight: "500" }}>{log.user_name}</div>
                        <div style={{ color: "#475569", fontSize: "10px", textTransform: "uppercase" }}>{log.user_role?.replace(/_/g, " ")}</div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          data-testid={`action-label-${idx}`}
                          style={{
                            fontSize: "11px", fontWeight: "600", color: ac.color, background: ac.bg,
                            padding: "4px 10px", borderRadius: "6px", whiteSpace: "nowrap",
                          }}
                        >
                          {ac.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          fontSize: "11px", color: "#94a3b8", background: "#1e2530",
                          padding: "3px 8px", borderRadius: "4px", textTransform: "uppercase",
                          letterSpacing: "0.5px", fontWeight: "600"
                        }}>
                          {log.module}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ color: "#475569", fontSize: "12px", fontFamily: "'DM Mono', monospace" }}>
                          {log.ip_address}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {hasDetails ? (
                          <button
                            data-testid={`expand-row-${idx}`}
                            onClick={(e) => { e.stopPropagation(); toggleRow(log.id || idx); }}
                            style={{
                              background: isExpanded ? "rgba(37, 99, 235, 0.1)" : "transparent",
                              border: `1px solid ${isExpanded ? "#2563eb" : "#1e2530"}`,
                              borderRadius: "6px", padding: "4px 10px", color: isExpanded ? "#2563eb" : "#94a3b8",
                              fontSize: "11px", fontWeight: "600", cursor: "pointer",
                              display: "flex", alignItems: "center", gap: "4px", transition: "all 0.15s",
                            }}
                          >
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {isExpanded ? "Collapse" : "View"}
                          </button>
                        ) : (
                          <span style={{ color: "#475569", fontSize: "11px" }}>&mdash;</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && hasDetails && (
                      <tr data-testid={`detail-row-${idx}`}>
                        <td colSpan={6} style={{ padding: "0 16px 12px 16px", borderBottom: idx < logs.length - 1 ? "1px solid #0f1520" : "none" }}>
                          <div style={{
                            background: "#080c12", border: "1px solid #1e2530", borderRadius: "8px",
                            padding: "14px", fontFamily: "'DM Mono', monospace", fontSize: "12px",
                            color: "#94a3b8", lineHeight: "1.7", overflowX: "auto",
                          }}>
                            {Object.entries(log.details).map(([key, val]) => (
                              <div key={key} style={{ display: "flex", gap: "8px" }}>
                                <span style={{ color: "#2563eb", minWidth: "140px", flexShrink: 0 }}>{key}:</span>
                                <span style={{ color: "#f1f5f9" }}>{typeof val === "object" ? JSON.stringify(val) : String(val)}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px", borderTop: "1px solid #1a1f2e"
        }}>
          <span style={{ color: "#475569", fontSize: "12px" }}>
            Showing {page * pageSize + 1}&ndash;{Math.min((page + 1) * pageSize, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => onPageChange(Math.max(0, page - 1))} disabled={page === 0} data-testid="prev-page-btn"
              style={{
                background: "#080c12", border: "1px solid #1e2530", borderRadius: "6px", padding: "6px 10px",
                color: page === 0 ? "#475569" : "#94a3b8", cursor: page === 0 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center"
              }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span style={{ color: "#94a3b8", fontSize: "12px", padding: "0 8px" }}>
              Page {page + 1} of {totalPages}
            </span>
            <button onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} data-testid="next-page-btn"
              style={{
                background: "#080c12", border: "1px solid #1e2530", borderRadius: "6px", padding: "6px 10px",
                color: page >= totalPages - 1 ? "#475569" : "#94a3b8", cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center"
              }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
