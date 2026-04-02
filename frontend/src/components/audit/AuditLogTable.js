import React from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

const actionLabels = {
  user_registered: "User Registered",
  totp_enabled: "2FA Enabled",
  customer_created: "Customer Created",
  customer_updated: "Customer Updated",
  case_created: "Case Created",
  case_updated: "Case Updated",
  case_note_added: "Case Note Added",
  case_escalated: "Case Escalated",
  case_closed: "Case Closed",
  sar_filed: "SAR Filed",
  screening_run: "Screening Run",
  pep_screening_run: "PEP Screening",
  adverse_media_screening_run: "Adverse Media Screening",
  adverse_media_hit_marked: "Media Hit Marked",
  cdd_status_updated: "CDD Status Updated",
  edd_checklist_updated: "EDD Checklist Updated",
  audit_log_exported: "Audit Log Exported"
};

const moduleColors = {
  auth: "#a855f7",
  customers: "#2563eb",
  cases: "#f97316",
  screening: "#ef4444",
  cdd: "#f59e0b",
  audit: "#64748b"
};

const HEADERS = ["Timestamp", "User", "Role", "Action", "Module", "Record", "IP"];

export const AuditLogTable = ({ logs, loading, total, page, pageSize, hasActiveFilters, onPageChange }) => {
  const totalPages = Math.ceil(total / pageSize);

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
                const mColor = moduleColors[log.module] || "#94a3b8";
                return (
                  <tr key={log.id || idx} data-testid={`audit-row-${idx}`}
                    style={{ borderBottom: idx < logs.length - 1 ? "1px solid #0f1520" : "none" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#131923"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      <div style={{ color: "#94a3b8", fontSize: "13px" }}>{new Date(log.timestamp).toLocaleDateString()}</div>
                      <div style={{ color: "#475569", fontSize: "11px" }}>{new Date(log.timestamp).toLocaleTimeString()}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ color: "#f1f5f9", fontSize: "13px", fontWeight: "500" }}>{log.user_name}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        fontSize: "10px", color: "#94a3b8", background: "#1e2530", padding: "3px 8px",
                        borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap"
                      }}>
                        {log.user_role?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ color: "#f1f5f9", fontSize: "13px" }}>
                        {actionLabels[log.action_type] || log.action_type?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        fontSize: "11px", color: mColor, background: `${mColor}18`, padding: "3px 8px",
                        borderRadius: "4px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px"
                      }}>
                        {log.module}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ color: "#475569", fontSize: "12px", fontFamily: "monospace" }}>
                        {log.record_id ? `${log.record_id.substring(0, 12)}...` : "\u2014"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ color: "#475569", fontSize: "12px" }}>{log.ip_address}</span>
                    </td>
                  </tr>
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
