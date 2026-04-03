import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import logger from "../utils/logger";
import { Users, AlertCircle, FileSearch, TrendingUp, Shield, Activity, Key, Search, RefreshCw } from "lucide-react";
import { useCountUp } from "../components/dashboard/useCountUp";
import { SparklineChart } from "../components/dashboard/SparklineChart";
import { RiskDonut } from "../components/dashboard/RiskDonut";
import { ActivityFeed } from "../components/dashboard/ActivityFeed";
import { IndiaHeatMap } from "../components/dashboard/IndiaHeatMap";
import { IntegrationCards } from "../components/dashboard/IntegrationCards";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function StatCard({ title, value, icon: Icon, color, trendData, trendKey, testId }) {
  const animatedValue = useCountUp(value);
  return (
    <div className="card-aml" data-testid={testId} style={{ position: "relative", overflow: "hidden" }}>
      <div className="flex items-center justify-between mb-3">
        <div style={{
          width: "40px", height: "40px", borderRadius: "10px",
          background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon style={{ color, width: "20px", height: "20px" }} />
        </div>
      </div>
      <div style={{ fontSize: "10px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1.5px", color: "#475569", marginBottom: "2px" }}>
        {title}
      </div>
      <div className="flex items-end justify-between">
        <div style={{ fontSize: "28px", fontWeight: "700", color: "#f1f5f9", lineHeight: 1 }}>
          {animatedValue}
        </div>
        {trendData && trendData.length > 0 && (
          <div style={{ width: "80px", height: "32px", opacity: 0.8 }}>
            <SparklineChart data={trendData} color={color} dataKey={trendKey} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [screenQuery, setScreenQuery] = useState("");

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [statsRes, trendsRes, feedRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`, { withCredentials: true }),
        axios.get(`${API}/dashboard/trends`, { withCredentials: true }),
        axios.get(`${API}/dashboard/activity-feed`, { withCredentials: true }),
      ]);
      setStats(statsRes.data);
      setTrends(trendsRes.data.trends || []);
      setFeed(feedRes.data.feed || []);
      setLastUpdated(new Date());
    } catch (error) {
      logger.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleQuickScreen = () => {
    if (screenQuery.trim()) {
      navigate(`/screening?q=${encodeURIComponent(screenQuery.trim())}`);
    }
  };

  function formatTimeAgo(date) {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 10) return "just now";
    if (secs < 60) return `${secs}s ago`;
    if (secs < 3600) return `${Math.floor(secs / 60)} min ago`;
    return `${Math.floor(secs / 3600)}h ago`;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div style={{ color: "#94a3b8" }}>Loading...</div></div>;
  }

  const scr = stats?.screening_stats || {};
  const kyc = stats?.kyc_stats || {};
  const cdd = stats?.cdd_breakdown || {};
  const api = stats?.api_usage || {};
  const integrations = stats?.integrations || {};

  return (
    <div data-testid="dashboard-page">
      {/* Quick Screen Bar */}
      <div data-testid="quick-screen-bar" style={{
        background: "#0d1117", border: "1px solid #1e2530", borderRadius: "12px",
        padding: "6px 6px 6px 20px", marginBottom: "24px",
        display: "flex", alignItems: "center",
      }}>
        <Search style={{ width: "18px", height: "18px", color: "#475569", flexShrink: 0 }} />
        <input
          value={screenQuery}
          onChange={(e) => setScreenQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleQuickScreen()}
          placeholder="Enter name or ID to screen instantly..."
          data-testid="quick-screen-input"
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            padding: "10px 14px", color: "#f1f5f9", fontSize: "14px",
          }}
        />
        <button
          onClick={handleQuickScreen}
          data-testid="quick-screen-btn"
          style={{
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)", border: "none",
            borderRadius: "8px", padding: "10px 24px", color: "#fff",
            fontSize: "13px", fontWeight: "600", cursor: "pointer",
            display: "flex", alignItems: "center", gap: "6px",
            transition: "opacity 0.15s",
          }}
        >
          <Search style={{ width: "14px", height: "14px" }} />
          Screen
        </button>
      </div>

      {/* Header with Last Updated */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: "700", letterSpacing: "-0.5px", color: "#f1f5f9", marginBottom: "4px" }} data-testid="dashboard-title">
            Compliance Dashboard
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>Real-time overview of your AML/KYC operations</p>
        </div>
        <div className="flex items-center gap-2" data-testid="last-updated">
          {lastUpdated && (
            <span style={{ fontSize: "11px", color: "#475569" }}>
              Last updated: {formatTimeAgo(lastUpdated)}
            </span>
          )}
          <button
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            data-testid="refresh-dashboard-btn"
            style={{
              background: "#0d1117", border: "1px solid #1e2530", borderRadius: "8px",
              padding: "6px 10px", cursor: "pointer", color: "#94a3b8",
              display: "flex", alignItems: "center", gap: "4px", fontSize: "11px",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.color = "#2563eb"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1e2530"; e.currentTarget.style.color = "#94a3b8"; }}
          >
            <RefreshCw style={{ width: "13px", height: "13px", animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Row with Sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <StatCard title="Total Customers" value={stats?.total_customers || 0} icon={Users} color="#2563eb" trendData={trends} trendKey="customers" testId="stat-card-total-customers" />
        <StatCard title="Pending Reviews" value={stats?.pending_reviews || 0} icon={FileSearch} color="#f59e0b" trendData={trends} trendKey="screenings" testId="stat-card-pending-reviews" />
        <StatCard title="High Risk" value={stats?.high_risk_customers || 0} icon={AlertCircle} color="#ef4444" trendData={trends} trendKey="risk" testId="stat-card-high-risk" />
        <StatCard title="Open Cases" value={stats?.open_cases || 0} icon={TrendingUp} color="#10b981" trendData={trends} trendKey="cases" testId="stat-card-open-cases" />
      </div>

      {/* Row 2: Donut + Screening + KYC */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="card-aml" data-testid="risk-distribution">
          <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9", marginBottom: "12px" }}>Risk Distribution</h2>
          <RiskDonut data={stats?.risk_distribution || {}} />
        </div>

        <div className="card-aml" data-testid="screening-stats">
          <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9", marginBottom: "16px" }}>Screening Alerts</h2>
          <div className="space-y-4">
            {[
              { label: "Sanctions Matches", value: scr.sanctions_matches || 0, icon: AlertCircle, color: "#ef4444" },
              { label: "PEP Matches", value: scr.pep_matches || 0, icon: Shield, color: "#f59e0b" },
              { label: "Adverse Media", value: scr.adverse_media_hits || 0, icon: FileSearch, color: "#8b5cf6" },
            ].map((s) => {
              const SIcon = s.icon;
              return (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <SIcon style={{ width: 16, height: 16, color: s.color }} />
                    </div>
                    <span style={{ fontSize: "13px", color: "#94a3b8" }}>{s.label}</span>
                  </div>
                  <span style={{ fontSize: "20px", fontWeight: 700, color: s.value > 0 ? s.color : "#475569" }}>{s.value}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card-aml" data-testid="kyc-cdd-stats">
          <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9", marginBottom: "16px" }}>KYC & Due Diligence</h2>
          <div className="space-y-3 mb-4">
            {[
              { label: "Verifications Run", value: kyc.total || 0, color: "#2563eb" },
              { label: "Verified", value: kyc.verified || 0, color: "#10b981" },
              { label: "Failed", value: kyc.failed || 0, color: "#ef4444" },
            ].map(k => (
              <div key={k.label} className="flex items-center justify-between">
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>{k.label}</span>
                <span style={{ fontSize: "16px", fontWeight: 700, color: k.color }}>{k.value}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #1e2530", paddingTop: "12px" }}>
            <div style={{ fontSize: "11px", color: "#475569", marginBottom: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>CDD Tiers</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "SDD", val: cdd.sdd || 0, color: "#10b981" },
                { label: "Standard", val: cdd.standard_cdd || 0, color: "#2563eb" },
                { label: "EDD", val: cdd.edd || 0, color: "#ef4444" },
              ].map(t => (
                <div key={t.label} style={{ textAlign: "center", padding: "8px", background: "#080c12", borderRadius: "6px" }}>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: t.color }}>{t.val}</div>
                  <div style={{ fontSize: "10px", color: "#475569" }}>{t.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Heat Map + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="card-aml" data-testid="screening-heatmap">
          <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9", marginBottom: "12px" }}>Screening Concentration</h2>
          <IndiaHeatMap />
        </div>

        <div className="card-aml" data-testid="activity-feed" style={{ maxHeight: "360px", display: "flex", flexDirection: "column" }}>
          <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9", marginBottom: "12px" }}>Live Activity Feed</h2>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <ActivityFeed feed={feed} />
          </div>
        </div>
      </div>

      {/* Row 4: Integrations + API Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card-aml" data-testid="integration-status">
          <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9", marginBottom: "16px" }}>Integration Status</h2>
          <IntegrationCards integrations={integrations} />
        </div>

        {api.total_api_calls !== undefined && (
          <div className="card-aml" data-testid="api-usage-stats">
            <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9", marginBottom: "16px" }}>API Usage</h2>
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
    </div>
  );
}
