import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import logger from "../utils/logger";
import { Users, AlertCircle, FileSearch, TrendingUp, ShieldCheck, Activity, Key, Shield } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getPriorityBadgeColor = (priority) => {
  if (priority === "critical" || priority === "high") return "danger";
  if (priority === "medium") return "warning";
  return "success";
};

const RISK_COLORS = { low: "#10b981", medium: "#f59e0b", high: "#ef4444", unacceptable: "#dc2626" };

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/dashboard/stats`, { withCredentials: true });
      setStats(data);
    } catch (error) {
      logger.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div style={{ color: "#94a3b8" }}>Loading...</div>
      </div>
    );
  }

  const statCards = [
    { title: "Total Customers", value: stats?.total_customers || 0, icon: Users, color: "#2563eb" },
    { title: "Pending Reviews", value: stats?.pending_reviews || 0, icon: FileSearch, color: "#f59e0b" },
    { title: "High Risk", value: stats?.high_risk_customers || 0, icon: AlertCircle, color: "#ef4444" },
    { title: "Open Cases", value: stats?.open_cases || 0, icon: TrendingUp, color: "#10b981" },
  ];

  const rd = stats?.risk_distribution || {};
  const riskTotal = (rd.low || 0) + (rd.medium || 0) + (rd.high || 0) + (rd.unacceptable || 0);

  const cdd = stats?.cdd_breakdown || {};
  const cddTotal = (cdd.sdd || 0) + (cdd.standard_cdd || 0) + (cdd.edd || 0);

  const kyc = stats?.kyc_stats || {};
  const scr = stats?.screening_stats || {};
  const api = stats?.api_usage || {};
  const integrations = stats?.integrations || {};

  return (
    <div data-testid="dashboard-page">
      <div className="mb-8">
        <h1 style={{ fontSize: "26px", fontWeight: "700", letterSpacing: "-0.5px", color: "#f1f5f9", marginBottom: "8px" }} data-testid="dashboard-title">
          Compliance Dashboard
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "14px" }}>
          Overview of your AML/KYC operations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="card-aml" data-testid={`stat-card-${stat.title.toLowerCase().replace(/ /g, '-')}`}>
              <div className="flex items-center justify-between mb-4">
                <div style={{
                  width: "44px", height: "44px", borderRadius: "8px",
                  background: `${stat.color}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon style={{ color: stat.color, width: "22px", height: "22px" }} />
                </div>
              </div>
              <div style={{ fontSize: "10px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "2px", color: "#475569", marginBottom: "4px" }}>
                {stat.title}
              </div>
              <div style={{ fontSize: "28px", fontWeight: "700", color: "#f1f5f9" }}>
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle row: Risk Distribution + Screening Stats + KYC Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Risk Distribution */}
        <div className="card-aml" data-testid="risk-distribution">
          <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9", marginBottom: "16px" }}>
            Risk Distribution
          </h2>
          <div className="space-y-3">
            {[
              { label: "Low", count: rd.low || 0, color: RISK_COLORS.low },
              { label: "Medium", count: rd.medium || 0, color: RISK_COLORS.medium },
              { label: "High", count: rd.high || 0, color: RISK_COLORS.high },
              { label: "Unacceptable", count: rd.unacceptable || 0, color: RISK_COLORS.unacceptable },
            ].map((r) => (
              <div key={r.label}>
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>{r.label}</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: r.color }}>{r.count}</span>
                </div>
                <div style={{ height: "6px", background: "#1e2530", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: riskTotal > 0 ? `${(r.count / riskTotal) * 100}%` : "0%",
                    background: r.color, borderRadius: "3px", transition: "width 0.5s ease",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Screening Alerts */}
        <div className="card-aml" data-testid="screening-stats">
          <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9", marginBottom: "16px" }}>
            Screening Alerts
          </h2>
          <div className="space-y-4">
            {[
              { label: "Sanctions Matches", value: scr.sanctions_matches || 0, icon: AlertCircle, color: "#ef4444" },
              { label: "PEP Matches", value: scr.pep_matches || 0, icon: Shield, color: "#f59e0b" },
              { label: "Adverse Media", value: scr.adverse_media_hits || 0, icon: FileSearch, color: "#8b5cf6" },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "8px",
                      background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon style={{ width: 16, height: 16, color: s.color }} />
                    </div>
                    <span style={{ fontSize: "13px", color: "#94a3b8" }}>{s.label}</span>
                  </div>
                  <span style={{ fontSize: "20px", fontWeight: 700, color: s.value > 0 ? s.color : "#475569" }}>
                    {s.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* KYC & CDD */}
        <div className="card-aml" data-testid="kyc-cdd-stats">
          <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9", marginBottom: "16px" }}>
            KYC & Due Diligence
          </h2>
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>Verifications Run</span>
              <span style={{ fontSize: "16px", fontWeight: 700, color: "#2563eb" }}>{kyc.total || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>Verified</span>
              <span style={{ fontSize: "16px", fontWeight: 700, color: "#10b981" }}>{kyc.verified || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>Failed</span>
              <span style={{ fontSize: "16px", fontWeight: 700, color: "#ef4444" }}>{kyc.failed || 0}</span>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #1e2530", paddingTop: "12px" }}>
            <div style={{ fontSize: "11px", color: "#475569", marginBottom: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>
              CDD Tiers
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "SDD", val: cdd.sdd || 0, color: "#10b981" },
                { label: "Standard", val: cdd.standard_cdd || 0, color: "#2563eb" },
                { label: "EDD", val: cdd.edd || 0, color: "#ef4444" },
              ].map((t) => (
                <div key={t.label} style={{
                  textAlign: "center", padding: "8px", background: "#080c12", borderRadius: "6px",
                }}>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: t.color }}>{t.val}</div>
                  <div style={{ fontSize: "10px", color: "#475569" }}>{t.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Integration Status + API Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card-aml" data-testid="integration-status">
          <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9", marginBottom: "16px" }}>
            Integration Status
          </h2>
          <div className="space-y-3">
            {Object.entries(integrations).map(([svc, info]) => (
              <div key={svc} className="flex items-center justify-between" style={{
                padding: "10px 12px", background: "#080c12", borderRadius: "8px", border: "1px solid #1e2530",
              }}>
                <div className="flex items-center gap-3">
                  <ShieldCheck style={{ width: 16, height: 16, color: info.mode === "live" ? "#10b981" : "#f59e0b" }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9", textTransform: "capitalize" }}>{svc}</div>
                    <div style={{ fontSize: "11px", color: "#475569" }}>{info.base_url}</div>
                  </div>
                </div>
                <span style={{
                  fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "4px",
                  color: info.mode === "live" ? "#10b981" : "#f59e0b",
                  background: info.mode === "live" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                  textTransform: "uppercase",
                }}>
                  {info.mode}
                </span>
              </div>
            ))}
          </div>
        </div>

        {api.total_api_calls !== undefined && (
          <div className="card-aml" data-testid="api-usage-stats">
            <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9", marginBottom: "16px" }}>
              API Usage
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div style={{ padding: "16px", background: "#080c12", borderRadius: "8px", textAlign: "center" }}>
                <Activity style={{ width: 20, height: 20, color: "#2563eb", margin: "0 auto 8px" }} />
                <div style={{ fontSize: "24px", fontWeight: 700, color: "#f1f5f9" }}>{api.total_api_calls}</div>
                <div style={{ fontSize: "11px", color: "#475569" }}>Total Calls</div>
              </div>
              <div style={{ padding: "16px", background: "#080c12", borderRadius: "8px", textAlign: "center" }}>
                <Key style={{ width: 20, height: 20, color: "#f59e0b", margin: "0 auto 8px" }} />
                <div style={{ fontSize: "24px", fontWeight: 700, color: "#f1f5f9" }}>{api.active_api_keys}</div>
                <div style={{ fontSize: "11px", color: "#475569" }}>Active Keys</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Customers + Open Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Customers */}
        <div className="card-aml" data-testid="recent-customers">
          <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9", marginBottom: "16px" }} data-testid="recent-customers-title">
            Recent Customers
          </h2>
          {stats?.recent_customers?.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_customers.map((customer, idx) => (
                <div key={customer.id} style={{
                  borderBottom: idx < stats.recent_customers.length - 1 ? "1px solid #0f1520" : "none",
                  paddingBottom: idx < stats.recent_customers.length - 1 ? "12px" : "0",
                }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: "500" }}>
                        {customer.customer_data?.full_name || customer.customer_data?.company_legal_name || "Unnamed"}
                      </div>
                      <div style={{ color: "#475569", fontSize: "12px" }}>
                        {customer.customer_type === "individual" ? "Individual" : "Corporate"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`status-badge status-${customer.risk_level}`}>{customer.risk_level}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "#475569", textAlign: "center", padding: "40px 0" }}>No customers yet</div>
          )}
        </div>

        {/* Open Cases */}
        <div className="card-aml" data-testid="open-cases">
          <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9", marginBottom: "16px" }} data-testid="open-cases-title">
            Open Cases
          </h2>
          {stats?.open_cases_list?.length > 0 ? (
            <div className="space-y-3">
              {stats.open_cases_list.map((c, idx) => (
                <div key={c.id} style={{
                  borderBottom: idx < stats.open_cases_list.length - 1 ? "1px solid #0f1520" : "none",
                  paddingBottom: idx < stats.open_cases_list.length - 1 ? "12px" : "0",
                }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: "500" }}>{c.case_id}</div>
                      <div style={{ color: "#475569", fontSize: "12px" }}>{c.customer_name} - {c.case_type}</div>
                    </div>
                    <span className={`status-badge status-${getPriorityBadgeColor(c.priority)}`}>{c.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "#475569", textAlign: "center", padding: "40px 0" }}>No open cases</div>
          )}
        </div>
      </div>
    </div>
  );
}
