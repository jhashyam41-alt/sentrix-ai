import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Search, Calendar, AlertCircle, CheckCircle, Clock } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getCDDTierColor = (tier) => {
  if (tier === "edd") return "danger";
  if (tier === "standard_cdd") return "warning";
  return "success";
};

const getCDDStatusColor = (status) => {
  if (status === "complete" || status === "edd_complete") return "success";
  if (status === "expired") return "danger";
  if (status === "requires_edd") return "danger";
  return "warning";
};

export default function CDDManagementPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTier, setFilterTier] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetchCustomers = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/customers?limit=100`, {
        withCredentials: true
      });
      setCustomers(data.customers || []);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = customers.filter(c => {
    if (filterTier && c.cdd_tier !== filterTier) return false;
    if (filterStatus && c.cdd_status !== filterStatus) return false;
    return true;
  });

  const stats = {
    sdd: customers.filter(c => c.cdd_tier === "sdd").length,
    standard: customers.filter(c => c.cdd_tier === "standard_cdd").length,
    edd: customers.filter(c => c.cdd_tier === "edd").length,
    expired: customers.filter(c => c.cdd_status === "expired").length
  };

  return (
    <div>
      <div className="mb-6">
        <h1 style={{
          fontSize: "26px",
          fontWeight: "700",
          letterSpacing: "-0.5px",
          color: "#f1f5f9",
          marginBottom: "8px"
        }} data-testid="cdd-title">CDD/EDD Management</h1>
        <p style={{ color: "#94a3b8", fontSize: "14px" }}>
          Customer Due Diligence and Enhanced Due Diligence tracking
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {[
          { title: "SDD Customers", value: stats.sdd, color: "#10b981" },
          { title: "Standard CDD", value: stats.standard, color: "#f59e0b" },
          { title: "EDD Required", value: stats.edd, color: "#ef4444" },
          { title: "Reviews Expired", value: stats.expired, color: "#ef4444" }
        ].map((stat) => (
          <div
            key={stat.title}
            style={{
              background: "#0d1117",
              border: "1px solid #1e2530",
              borderRadius: "12px",
              padding: "20px"
            }}
          >
            <div style={{
              fontSize: "10px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "2px",
              color: "#475569",
              marginBottom: "8px"
            }}>
              {stat.title}
            </div>
            <div style={{
              fontSize: "32px",
              fontWeight: "700",
              color: stat.color
            }}>
              {stat.value}
            </div>
          </div>
        ))}
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
            }}>CDD Tier</label>
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
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
              <option value="">All Tiers</option>
              <option value="sdd">SDD</option>
              <option value="standard_cdd">Standard CDD</option>
              <option value="edd">EDD</option>
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
            }}>CDD Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
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
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="complete">Complete</option>
              <option value="expired">Expired</option>
              <option value="requires_edd">Requires EDD</option>
              <option value="edd_in_progress">EDD In Progress</option>
              <option value="edd_complete">EDD Complete</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div style={{
        background: "#0d1117",
        border: "1px solid #1e2530",
        borderRadius: "12px",
        overflow: "hidden"
      }}>
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
            Loading CDD data...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
            No customers found
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
                  }}>Customer</th>
                  <th style={{
                    padding: "16px 24px",
                    textAlign: "left",
                    fontSize: "10px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    color: "#475569",
                    letterSpacing: "1px"
                  }}>CDD Tier</th>
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
                  }}>Risk Level</th>
                  <th style={{
                    padding: "16px 24px",
                    textAlign: "left",
                    fontSize: "10px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    color: "#475569",
                    letterSpacing: "1px"
                  }}>Review Date</th>
                  <th style={{
                    padding: "16px 24px",
                    textAlign: "left",
                    fontSize: "10px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    color: "#475569",
                    letterSpacing: "1px"
                  }}>Expiry</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer, idx) => (
                  <tr
                    key={customer.id}
                    style={{
                      borderBottom: idx < filteredCustomers.length - 1 ? "1px solid #0f1520" : "none"
                    }}
                  >
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: "500", marginBottom: "4px" }}>
                        {customer.customer_data?.full_name || customer.customer_data?.company_legal_name || "Unnamed"}
                      </div>
                      <div style={{ color: "#475569", fontSize: "12px" }}>
                        {customer.id}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span className={`status-badge status-${getCDDTierColor(customer.cdd_tier)}`}>
                        {customer.cdd_tier?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span className={`status-badge status-${getCDDStatusColor(customer.cdd_status)}`}>
                        {customer.cdd_status?.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span className={`status-badge status-${customer.risk_level}`}>
                        {customer.risk_level}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{ color: "#94a3b8", fontSize: "13px" }}>
                        {customer.cdd_review_date || "Not set"}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div className="flex items-center gap-2">
                        {customer.cdd_status === "expired" && (
                          <AlertCircle className="w-4 h-4" style={{ color: "#ef4444" }} />
                        )}
                        <span style={{ color: customer.cdd_status === "expired" ? "#ef4444" : "#94a3b8", fontSize: "13px" }}>
                          {customer.cdd_expiry_date || "Not set"}
                        </span>
                      </div>
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