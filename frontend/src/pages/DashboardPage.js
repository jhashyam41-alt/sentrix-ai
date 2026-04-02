import React, { useState, useEffect } from "react";
import axios from "axios";
import { Users, AlertCircle, FileSearch, TrendingUp } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await axios.get(`${API}/dashboard/stats`, {
        withCredentials: true
      });
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div style={{ color: "#94a3b8" }}>Loading...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Customers",
      value: stats?.total_customers || 0,
      icon: Users,
      color: "#2563eb"
    },
    {
      title: "Pending Reviews",
      value: stats?.pending_reviews || 0,
      icon: FileSearch,
      color: "#f59e0b"
    },
    {
      title: "High Risk Customers",
      value: stats?.high_risk_customers || 0,
      icon: AlertCircle,
      color: "#ef4444"
    },
    {
      title: "Open Cases",
      value: stats?.open_cases || 0,
      icon: TrendingUp,
      color: "#10b981"
    }
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 style={{
          fontSize: "26px",
          fontWeight: "700",
          letterSpacing: "-0.5px",
          color: "#f1f5f9",
          marginBottom: "8px"
        }} data-testid="dashboard-title">Compliance Dashboard</h1>
        <p style={{ color: "#94a3b8", fontSize: "14px" }}>
          Overview of your AML/KYC operations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              style={{
                background: "#0d1117",
                border: "1px solid #1e2530",
                borderRadius: "12px",
                padding: "24px"
              }}
              data-testid={`stat-card-${index}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "8px",
                  background: `rgba(${parseInt(stat.color.slice(1, 3), 16)}, ${parseInt(stat.color.slice(3, 5), 16)}, ${parseInt(stat.color.slice(5, 7), 16)}, 0.18)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Icon style={{ color: stat.color, width: "24px", height: "24px" }} />
                </div>
              </div>
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
                color: "#f1f5f9"
              }}>
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Customers */}
      <div style={{
        background: "#0d1117",
        border: "1px solid #1e2530",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px"
      }}>
        <h2 style={{
          fontSize: "13px",
          fontWeight: "700",
          color: "#f1f5f9",
          marginBottom: "16px"
        }} data-testid="recent-customers-title">Recent Customers</h2>
        
        {stats?.recent_customers && stats.recent_customers.length > 0 ? (
          <div className="space-y-3">
            {stats.recent_customers.map((customer, index) => (
              <div
                key={index}
                style={{
                  borderBottom: index < stats.recent_customers.length - 1 ? "1px solid #0f1520" : "none",
                  paddingBottom: index < stats.recent_customers.length - 1 ? "12px" : "0"
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: "500" }}>
                      {customer.customer_data?.full_name || customer.customer_data?.company_legal_name || "Unnamed Customer"}
                    </div>
                    <div style={{ color: "#475569", fontSize: "12px" }}>
                      {customer.customer_type === "individual" ? "Individual" : "Corporate"} • {customer.id}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`status-badge status-${customer.risk_level}`}>
                      {customer.risk_level}
                    </span>
                    <span style={{
                      color: "#94a3b8",
                      fontSize: "11px",
                      padding: "4px 8px",
                      background: "#1e2530",
                      borderRadius: "4px"
                    }}>
                      {customer.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: "#475569", textAlign: "center", padding: "40px 0" }}>
            No customers yet
          </div>
        )}
      </div>

      {/* Open Cases */}
      <div style={{
        background: "#0d1117",
        border: "1px solid #1e2530",
        borderRadius: "12px",
        padding: "24px"
      }}>
        <h2 style={{
          fontSize: "13px",
          fontWeight: "700",
          color: "#f1f5f9",
          marginBottom: "16px"
        }} data-testid="open-cases-title">Open Cases</h2>
        
        {stats?.open_cases_list && stats.open_cases_list.length > 0 ? (
          <div className="space-y-3">
            {stats.open_cases_list.map((caseItem, index) => (
              <div
                key={index}
                style={{
                  borderBottom: index < stats.open_cases_list.length - 1 ? "1px solid #0f1520" : "none",
                  paddingBottom: index < stats.open_cases_list.length - 1 ? "12px" : "0"
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: "500" }}>
                      {caseItem.case_id}
                    </div>
                    <div style={{ color: "#475569", fontSize: "12px" }}>
                      {caseItem.customer_name} • {caseItem.case_type}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`status-badge status-${caseItem.priority === "critical" || caseItem.priority === "high" ? "danger" : caseItem.priority === "medium" ? "warning" : "success"}`}>
                      {caseItem.priority}
                    </span>
                    <span style={{
                      color: "#94a3b8",
                      fontSize: "11px",
                      padding: "4px 8px",
                      background: "#1e2530",
                      borderRadius: "4px"
                    }}>
                      {caseItem.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: "#475569", textAlign: "center", padding: "40px 0" }}>
            No open cases
          </div>
        )}
      </div>
    </div>
  );
}
