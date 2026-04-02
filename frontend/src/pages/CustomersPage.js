import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logger from "../utils/logger";
import { Plus, Search, Filter } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRisk, setFilterRisk] = useState("");
  const navigate = useNavigate();

  const fetchCustomers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append("status", filterStatus);
      if (filterRisk) params.append("risk_level", filterRisk);
      
      const { data } = await axios.get(`${API}/customers?${params}`, {
        withCredentials: true
      });
      setCustomers(data.customers || []);
    } catch (error) {
      logger.error("Failed to fetch customers:", error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterRisk]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = customers.filter(c => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const name = c.customer_data?.full_name || c.customer_data?.company_legal_name || "";
    return name.toLowerCase().includes(searchLower) || c.id.toLowerCase().includes(searchLower);
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
          }} data-testid="customers-title">Customers</h1>
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>
            Manage customer profiles and onboarding
          </p>
        </div>
        <button
          onClick={() => navigate("/customers/new")}
          data-testid="add-customer-button"
          style={{
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
            color: "#ffffff",
            fontWeight: "600",
            padding: "10px 20px",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px"
          }}
        >
          <Plus className="w-4 h-4" />
          New Customer
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label style={{
              fontSize: "11px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "1px",
              color: "#475569",
              marginBottom: "8px",
              display: "block"
            }}>Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: "#475569" }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or ID..."
                data-testid="search-input"
                style={{
                  background: "#080c12",
                  border: "1px solid #1e2530",
                  borderRadius: "8px",
                  padding: "8px 12px 8px 36px",
                  color: "#f1f5f9",
                  fontSize: "14px",
                  width: "100%"
                }}
              />
            </div>
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
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
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
            }}>Risk Level</label>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              data-testid="risk-filter"
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
              <option value="">All Risk Levels</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="unacceptable">Unacceptable</option>
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
            Loading customers...
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
                  }}>Type</th>
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
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer, idx) => (
                  <tr
                    key={customer.id}
                    style={{
                      borderBottom: idx < filteredCustomers.length - 1 ? "1px solid #0f1520" : "none",
                      cursor: "pointer"
                    }}
                    onClick={() => navigate(`/customers/${customer.id}`)}
                    data-testid={`customer-row-${customer.id}`}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#1e2530";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
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
                      <span style={{
                        color: "#94a3b8",
                        fontSize: "13px",
                        textTransform: "capitalize"
                      }}>
                        {customer.customer_type}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span className={`status-badge status-${customer.risk_level}`}>
                        {customer.risk_level}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{
                        color: "#94a3b8",
                        fontSize: "13px",
                        textTransform: "uppercase"
                      }}>
                        {customer.cdd_tier?.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{
                        color: "#94a3b8",
                        fontSize: "12px",
                        padding: "4px 8px",
                        background: "#1e2530",
                        borderRadius: "4px"
                      }}>
                        {customer.status.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/customers/${customer.id}`);
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
