import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import logger from "../utils/logger";
import { FileText, Download } from "lucide-react";
import { AuditLogFilters } from "../components/audit/AuditLogFilters";
import { AuditLogTable } from "../components/audit/AuditLogTable";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const PAGE_SIZE = 50;

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    action_type: "", user_name: "", module: "", start_date: "", end_date: ""
  });
  const [filterOptions, setFilterOptions] = useState({ action_types: [], modules: [], users: [] });
  const [exporting, setExporting] = useState(null);

  const fetchFilters = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/audit-logs/filters`, { withCredentials: true });
      setFilterOptions(data);
    } catch (err) {
      logger.error("Failed to fetch filter options:", err);
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

      const { data } = await axios.get(`${API}/audit-logs?${params}`, { withCredentials: true });
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      logger.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchFilters(); }, [fetchFilters]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({ action_type: "", user_name: "", module: "", start_date: "", end_date: "" });
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

      const response = await axios.get(`${API}/audit-logs/export/${format}?${params}`, {
        withCredentials: true, responseType: "blob"
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `audit_log.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      logger.error(`Export ${format} failed:`, err);
    } finally {
      setExporting(null);
    }
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== "");

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: "700", letterSpacing: "-0.5px", color: "#f1f5f9", marginBottom: "4px" }} data-testid="audit-log-title">
            Audit Log
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>
            Immutable record of all system activity &mdash; {total.toLocaleString()} entries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportFile("csv")} disabled={exporting === "csv"} data-testid="export-csv-btn"
            style={{
              background: "#0d1117", border: "1px solid #1e2530", borderRadius: "8px", padding: "8px 14px",
              color: "#94a3b8", fontSize: "13px", fontWeight: "600", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "6px", transition: "all 0.15s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.color = "#f1f5f9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1e2530"; e.currentTarget.style.color = "#94a3b8"; }}>
            <Download className="w-4 h-4" />
            {exporting === "csv" ? "Exporting..." : "CSV"}
          </button>
          <button onClick={() => exportFile("pdf")} disabled={exporting === "pdf"} data-testid="export-pdf-btn"
            style={{
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)", borderRadius: "8px", padding: "8px 14px",
              color: "#ffffff", fontSize: "13px", fontWeight: "600", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "6px", border: "none",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)"
            }}>
            <FileText className="w-4 h-4" />
            {exporting === "pdf" ? "Exporting..." : "PDF"}
          </button>
        </div>
      </div>

      <AuditLogFilters
        filters={filters}
        filterOptions={filterOptions}
        hasActiveFilters={hasActiveFilters}
        onFilterChange={handleFilterChange}
        onClear={clearFilters}
      />

      <AuditLogTable
        logs={logs}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        hasActiveFilters={hasActiveFilters}
        onPageChange={setPage}
      />
    </div>
  );
}
