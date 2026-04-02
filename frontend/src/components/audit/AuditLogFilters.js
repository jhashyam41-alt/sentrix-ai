import React from "react";
import { Filter } from "lucide-react";

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

export const AuditLogFilters = ({ filters, filterOptions, hasActiveFilters, onFilterChange, onClear }) => (
  <div style={{
    background: "#0d1117",
    border: "1px solid #1e2530",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "24px"
  }}>
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4" style={{ color: "#475569" }} />
        <span style={{ fontSize: "12px", fontWeight: "600", color: "#475569", textTransform: "uppercase", letterSpacing: "1px" }}>
          Filters
        </span>
      </div>
      {hasActiveFilters && (
        <button onClick={onClear} data-testid="clear-filters-btn"
          style={{ background: "transparent", border: "1px solid #1e2530", borderRadius: "6px", padding: "4px 10px", color: "#94a3b8", fontSize: "11px", cursor: "pointer" }}>
          Clear All
        </button>
      )}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div>
        <label style={labelStyle}>Action Type</label>
        <select value={filters.action_type} onChange={(e) => onFilterChange("action_type", e.target.value)} style={selectStyle} data-testid="filter-action-type">
          <option value="">All Actions</option>
          {filterOptions.action_types.map((a) => (
            <option key={a} value={a}>{actionLabels[a] || a.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelStyle}>User</label>
        <select value={filters.user_name} onChange={(e) => onFilterChange("user_name", e.target.value)} style={selectStyle} data-testid="filter-user">
          <option value="">All Users</option>
          {filterOptions.users.map((u) => (<option key={u} value={u}>{u}</option>))}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Module</label>
        <select value={filters.module} onChange={(e) => onFilterChange("module", e.target.value)} style={selectStyle} data-testid="filter-module">
          <option value="">All Modules</option>
          {filterOptions.modules.map((m) => (<option key={m} value={m}>{m}</option>))}
        </select>
      </div>
      <div>
        <label style={labelStyle}>From Date</label>
        <input type="date" value={filters.start_date} onChange={(e) => onFilterChange("start_date", e.target.value)} style={selectStyle} data-testid="filter-start-date" />
      </div>
      <div>
        <label style={labelStyle}>To Date</label>
        <input type="date" value={filters.end_date} onChange={(e) => onFilterChange("end_date", e.target.value)} style={selectStyle} data-testid="filter-end-date" />
      </div>
    </div>
  </div>
);
