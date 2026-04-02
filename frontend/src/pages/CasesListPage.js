import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logger from "../utils/logger";
import { Plus, Search, AlertCircle, Clock, CheckCircle } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getPriorityColor = (priority) => {
  if (priority === "critical" || priority === "high") return "danger";
  if (priority === "medium") return "warning";
  return "success";
};

const getStatusColor = (status) => {
  if (status === "closed") return "success";
  if (status === "escalated") return "danger";
  if (status === "pending_info") return "warning";
  return "low";
};

export default function CasesListPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const navigate = useNavigate();

  const fetchCases = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append("status", filterStatus);
      if (filterPriority) params.append("priority", filterPriority);
      
      const { data } = await axios.get(`${API}/cases?${params}`, {
        withCredentials: true
      });
      setCases(data.cases || []);
    } catch (error) {
      logger.error("Failed to fetch cases:", error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

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
          }} data-testid="cases-title">Case Management</h1>
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>
            Manage compliance investigations and alerts
          </p>
        </div>
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
            }}>Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              data-testid="status-filter"
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
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="escalated">Escalated</option>
              <option value="pending_info">Pending Info</option>
              <option value="closed">Closed</option>
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
            }}>Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              data-testid="priority-filter"
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
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cases Table */}
      <div style={{
        background: "#0d1117",
        border: "1px solid #1e2530",
        borderRadius: "12px",
        overflow: "hidden"
      }}>
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
            Loading cases...
          </div>
        ) : cases.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
            <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: "#475569" }} />
            <p>No cases found</p>
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
                  }}>Case ID</th>
                  <th style={{
                    padding: "16px 24px",
                    textAlign: "left",
                    fontSize: "10px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    color: "#475569",
                    letterSpacing: "1px"
                  }}>Customer</th>
                  <th style={{
                    padding: "16px 24px",
                    textAlign: "left",
                    fontSize: "10px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    color: "#475569",
                    letterSpacing: "1px"
                  }}>Type</th>
                  <th style={{
                    padding: "16px 24px",
                    textAlign: "left",
                    fontSize: "10px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    color: "#475569",
                    letterSpacing: "1px"
                  }}>Priority</th>
                  <th style={{
                    padding: "16px 24px",
                    textAlign: "left",
                    fontSize: "10px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    color: "#475569",
                    letterSpacing: "1px"
                  }}>Status</th>
                  <th style={{
                    padding: "16px 24px",
                    textAlign: "left",
                    fontSize: "10px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    color: "#475569",
                    letterSpacing: "1px"
                  }}>Assigned To</th>
                  <th style={{
                    padding: "16px 24px",
                    textAlign: "left",
                    fontSize: "10px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    color: "#475569",
                    letterSpacing: "1px"
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((caseItem, idx) => (
                  <tr
                    key={caseItem.id}
                    style={{
                      borderBottom: idx < cases.length - 1 ? "1px solid #0f1520" : "none",
                      cursor: "pointer"
                    }}
                    onClick={() => navigate(`/cases/${caseItem.id}`)}
                    data-testid={`case-row-${caseItem.id}`}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#1e2530";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ color: "#2563eb", fontSize: "14px", fontWeight: "600" }}>
                        {caseItem.case_id}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ color: "#f1f5f9", fontSize: "14px" }}>
                        {caseItem.customer_name}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{
                        color: "#94a3b8",
                        fontSize: "13px",
                        textTransform: "capitalize"
                      }}>
                        {caseItem.case_type.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span className={`status-badge status-${getPriorityColor(caseItem.priority)}`}>
                        {caseItem.priority}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span className={`status-badge status-${getStatusColor(caseItem.status)}`}>
                        {caseItem.status.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{ color: "#94a3b8", fontSize: "13px" }}>
                        {caseItem.assigned_to || "Unassigned"}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/cases/${caseItem.id}`);
                        }}
                        style={{
                          background: "transparent",
                          border: "1px solid #1e2530",
                          borderRadius: "6px",
                          padding: "6px 12px",
                          color: "#94a3b8",
                          fontSize: "12px",
                          cursor: "pointer"
                        }}
                      >
                        View
                      </button>
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