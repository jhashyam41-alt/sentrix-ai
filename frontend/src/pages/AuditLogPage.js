import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Search, Download, Filter, FileText } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");
  const [filterModule, setFilterModule] = useState("");

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterAction) params.append("action_type", filterAction);
      
      const { data } = await axios.get(`${API}/audit-logs?${params}&limit=100`, {
        withCredentials: true
      });
      setLogs(data.logs || []);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
    }
  }, [filterAction]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter(log => {
    if (filterModule && log.module !== filterModule) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{
            fontSize: "26px",
            fontWeight: "700",
            letterSpacing: "-0.5px",
            color: "#f1f5f9",
            marginBottom: "8px"
          }} data-testid="audit-title">Audit Trail</h1>
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>
            Immutable log of all system activities
          </p>
        </div>
        <button
          onClick={() => window.alert("Export functionality coming soon")}
          style={{
            background: "transparent",
            border: "1px solid #1e2530",
            borderRadius: "8px",
            padding: "10px 20px",
            color: "#f1f5f9",
            fontWeight: "600",
            fontSize: "14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{
        background: "#0d1117",
        border: "1px solid #1e2530",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "24px"
      }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label style={{
              fontSize: "11px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "1px",
              color: "#475569",
              marginBottom: "8px",
              display: "block"
            }}>Action Type</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              style={{
                background: "#080c12",
                border: "1px solid #1e2530",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "#f1f5f9",
                fontSize: "14px",
                width: "100%"
              }}
            >
              <option value="">All Actions</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="customer_created">Customer Created</option>
              <option value="customer_updated">Customer Updated</option>
              <option value="case_created">Case Created</option>
              <option value="screening_run">Screening Run</option>
              <option value="user_registered">User Registered</option>
            </select>
          </div>
          
          <div>
            <label style={{
              fontSize: "11px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "1px",
              color: "#475569",
              marginBottom: "8px",
              display: "block"
            }}>Module</label>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              style={{
                background: "#080c12",
                border: "1px solid #1e2530",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "#f1f5f9",
                fontSize: "14px",
                width: "100%"
              }}
            >
              <option value="">All Modules</option>
              <option value="auth">Authentication</option>
              <option value="customers">Customers</option>
              <option value="cases">Cases</option>
              <option value="screening">Screening</option>
              <option value="settings">Settings</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div style={{
        background: "#0d1117",
        border: "1px solid #1e2530",
        borderRadius: "12px",
        overflow: "hidden"
      }}>
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
            Loading audit logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
            <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: "#475569" }} />
            <p>No audit logs found</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #0f1520" }}>
                  <th style={{
                    padding: "16px 24px",
                    textAlign: "left",
                    fontSize: "10px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    color: "#475569",
                    letterSpacing: "1px"
                  }}>Timestamp</th>
                  <th style={{
                    padding: "16px 24px",
                    textAlign: "left",
                    fontSize: "10px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    color: "#475569",
                    letterSpacing: "1px"
                  }}>User</th>
                  <th style={{
                    padding: "16px 24px",
                    textAlign: "left",
                    fontSize: "10px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    color: "#475569",
                    letterSpacing: "1px"
                  }}>Action</th>
                  <th style={{
                    padding: "16px 24px",
                    textAlign: "left",
                    fontSize: "10px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    color: "#475569",
                    letterSpacing: "1px"
                  }}>Module</th>
                  <th style={{
                    padding: "16px 24px",
                    textAlign: "left",
                    fontSize: "10px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    color: "#475569",
                    letterSpacing: "1px"
                  }}>IP Address</th>
                  <th style={{
                    padding: "16px 24px",
                    textAlign: "left",
                    fontSize: "10px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    color: "#475569",
                    letterSpacing: "1px"
                  }}>Record ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: idx < filteredLogs.length - 1 ? "1px solid #0f1520" : "none"
                    }}
                  >
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ color: "#f1f5f9", fontSize: "13px" }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ color: "#f1f5f9", fontSize: "13px", marginBottom: "2px" }}>
                        {log.user_name}
                      </div>
                      <div style={{ color: "#475569", fontSize: "11px" }}>
                        {log.user_role}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{
                        color: "#94a3b8",
                        fontSize: "13px",
                        textTransform: "capitalize"
                      }}>
                        {log.action_type.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{ color: "#94a3b8", fontSize: "13px", textTransform: "capitalize" }}>
                        {log.module}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{ color: "#475569", fontSize: "12px", fontFamily: "monospace" }}>
                        {log.ip_address}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{ color: "#475569", fontSize: "12px" }}>
                        {log.record_id || "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}