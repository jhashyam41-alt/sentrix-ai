import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { FileText, Download, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const PAGE_SIZE = 50;

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

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    action_type: "",
    user_name: "",
    module: "",
    start_date: "",
    end_date: ""
  });
  const [filterOptions, setFilterOptions] = useState({
    action_types: [],
    modules: [],
    users: []
  });
  const [exporting, setExporting] = useState(null);

  const fetchFilters = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/audit-logs/filters`, {
        withCredentials: true
      });
      setFilterOptions(data);
    } catch (err) {
      console.error("Failed to fetch filter options:", err);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("limit", PAGE_SIZE);
      params.append("skip", page * PAGE_SIZE);
      if (filters.action_type) params.append("action_type", filters.action_type);
      if (filters.user_name) params.append("user_name", filters.user_name);
      if (filters.module) params.append("module", filters.module);
      if (filters.start_date) params.append("start_date", filters.start_date);
      if (filters.end_date) params.append("end_date", filters.end_date);

      const { data } = await axios.get(`${API}/audit-logs?${params}`, {
        withCredentials: true
      });
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({
      action_type: "",
      user_name: "",
      module: "",
      start_date: "",
      end_date: ""
    });
    setPage(0);
  };

  const exportFile = async (format) => {
    setExporting(format);
    try {
      const params = new URLSearchParams();
      if (filters.action_type) params.append("action_type", filters.action_type);
      if (filters.user_name) params.append("user_name", filters.user_name);
      if (filters.module) params.append("module", filters.module);
      if (filters.start_date) params.append("start_date", filters.start_date);
      if (filters.end_date) params.append("end_date", filters.end_date);

      const response = await axios.get(
        `${API}/audit-logs/export/${format}?${params}`,
        { withCredentials: true, responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `audit_log.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Export ${format} failed:`, err);
    } finally {
      setExporting(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasActiveFilters = Object.values(filters).some(v => v !== "");

  const selectStyle = {
    background: "#080c12",
    border: "1px solid #1e2530",
    borderRadius: "8px",
    padding: "8px 12px",
    color: "#f1f5f9",
    fontSize: "13px",
    width: "100%"
  };

  const labelStyle = {
    fontSize: "10px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "1px",
    color: "#475569",
    marginBottom: "6px",
    display: "block"
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: "700",
              letterSpacing: "-0.5px",
              color: "#f1f5f9",
              marginBottom: "4px"
            }}
            data-testid="audit-log-title"
          >
            Audit Log
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>
            Immutable record of all system activity
            &mdash; {total.toLocaleString()} entries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportFile("csv")}
            disabled={exporting === "csv"}
            data-testid="export-csv-btn"
            style={{
              background: "#0d1117",
              border: "1px solid #1e2530",
              borderRadius: "8px",
              padding: "8px 14px",
              color: "#94a3b8",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.15s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#2563eb";
              e.currentTarget.style.color = "#f1f5f9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#1e2530";
              e.currentTarget.style.color = "#94a3b8";
            }}
          >
            <Download className="w-4 h-4" />
            {exporting === "csv" ? "Exporting..." : "CSV"}
          </button>
          <button
            onClick={() => exportFile("pdf")}
            disabled={exporting === "pdf"}
            data-testid="export-pdf-btn"
            style={{
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              borderRadius: "8px",
              padding: "8px 14px",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              border: "none",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)"
            }}
          >
            <FileText className="w-4 h-4" />
            {exporting === "pdf" ? "Exporting..." : "PDF"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          background: "#0d1117",
          border: "1px solid #1e2530",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "24px"
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" style={{ color: "#475569" }} />
            <span
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: "1px"
              }}
            >
              Filters
            </span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              data-testid="clear-filters-btn"
              style={{
                background: "transparent",
                border: "1px solid #1e2530",
                borderRadius: "6px",
                padding: "4px 10px",
                color: "#94a3b8",
                fontSize: "11px",
                cursor: "pointer"
              }}
            >
              Clear All
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label style={labelStyle}>Action Type</label>
            <select
              value={filters.action_type}
              onChange={(e) => handleFilterChange("action_type", e.target.value)}
              style={selectStyle}
              data-testid="filter-action-type"
            >
              <option value="">All Actions</option>
              {filterOptions.action_types.map((a) => (
                <option key={a} value={a}>
                  {actionLabels[a] || a.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>User</label>
            <select
              value={filters.user_name}
              onChange={(e) => handleFilterChange("user_name", e.target.value)}
              style={selectStyle}
              data-testid="filter-user"
            >
              <option value="">All Users</option>
              {filterOptions.users.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Module</label>
            <select
              value={filters.module}
              onChange={(e) => handleFilterChange("module", e.target.value)}
              style={selectStyle}
              data-testid="filter-module"
            >
              <option value="">All Modules</option>
              {filterOptions.modules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>From Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange("start_date", e.target.value)}
              style={selectStyle}
              data-testid="filter-start-date"
            />
          </div>
          <div>
            <label style={labelStyle}>To Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange("end_date", e.target.value)}
              style={selectStyle}
              data-testid="filter-end-date"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: "#0d1117",
          border: "1px solid #1e2530",
          borderRadius: "12px",
          overflow: "hidden"
        }}
      >
        {loading ? (
          <div
            style={{
              padding: "60px",
              textAlign: "center",
              color: "#94a3b8"
            }}
          >
            Loading audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div
            style={{
              padding: "60px",
              textAlign: "center",
              color: "#475569"
            }}
          >
            <Search
              className="w-10 h-10 mx-auto mb-3"
              style={{ opacity: 0.4 }}
            />
            <p style={{ fontSize: "14px" }}>No audit log entries found</p>
            {hasActiveFilters && (
              <p style={{ fontSize: "12px", marginTop: "4px" }}>
                Try adjusting your filters
              </p>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{ width: "100%", borderCollapse: "collapse" }}
              data-testid="audit-log-table"
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #1a1f2e" }}>
                  {[
                    "Timestamp",
                    "User",
                    "Role",
                    "Action",
                    "Module",
                    "Record",
                    "IP"
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "14px 16px",
                        textAlign: "left",
                        fontSize: "10px",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        color: "#475569",
                        letterSpacing: "1px",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => {
                  const mColor = moduleColors[log.module] || "#94a3b8";
                  return (
                    <tr
                      key={log.id || idx}
                      data-testid={`audit-row-${idx}`}
                      style={{
                        borderBottom:
                          idx < logs.length - 1
                            ? "1px solid #0f1520"
                            : "none"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#131923";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <td
                        style={{
                          padding: "12px 16px",
                          whiteSpace: "nowrap"
                        }}
                      >
                        <div
                          style={{ color: "#94a3b8", fontSize: "13px" }}
                        >
                          {new Date(log.timestamp).toLocaleDateString()}
                        </div>
                        <div
                          style={{ color: "#475569", fontSize: "11px" }}
                        >
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div
                          style={{
                            color: "#f1f5f9",
                            fontSize: "13px",
                            fontWeight: "500"
                          }}
                        >
                          {log.user_name}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            fontSize: "10px",
                            color: "#94a3b8",
                            background: "#1e2530",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {log.user_role?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{ color: "#f1f5f9", fontSize: "13px" }}
                        >
                          {actionLabels[log.action_type] ||
                            log.action_type?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            color: mColor,
                            background: `${mColor}18`,
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontWeight: "600",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px"
                          }}
                        >
                          {log.module}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            color: "#475569",
                            fontSize: "12px",
                            fontFamily: "monospace"
                          }}
                        >
                          {log.record_id
                            ? `${log.record_id.substring(0, 12)}...`
                            : "\u2014"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{ color: "#475569", fontSize: "12px" }}
                        >
                          {log.ip_address}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderTop: "1px solid #1a1f2e"
            }}
          >
            <span style={{ color: "#475569", fontSize: "12px" }}>
              Showing {page * PAGE_SIZE + 1}&ndash;
              {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                data-testid="prev-page-btn"
                style={{
                  background: "#080c12",
                  border: "1px solid #1e2530",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  color: page === 0 ? "#475569" : "#94a3b8",
                  cursor: page === 0 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span
                style={{
                  color: "#94a3b8",
                  fontSize: "12px",
                  padding: "0 8px"
                }}
              >
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={page >= totalPages - 1}
                data-testid="next-page-btn"
                style={{
                  background: "#080c12",
                  border: "1px solid #1e2530",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  color:
                    page >= totalPages - 1 ? "#475569" : "#94a3b8",
                  cursor:
                    page >= totalPages - 1
                      ? "not-allowed"
                      : "pointer",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
