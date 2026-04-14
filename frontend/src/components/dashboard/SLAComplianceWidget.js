import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Clock, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";
import logger from "../../utils/logger";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DONUT_COLORS = {
  on_time: "#10b981",
  breached: "#8B0000",
  pending: "#FFD700",
};

function SLAMetricCard({ title, value, subtitle, icon: Icon, color, trend, testId }) {
  return (
    <div data-testid={testId} style={{
      background: "#0d1117", border: "1px solid #1e2530", borderRadius: "10px",
      padding: "18px", flex: 1, minWidth: 0,
    }}>
      <div className="flex items-center justify-between mb-3">
        <div style={{
          width: "34px", height: "34px", borderRadius: "8px",
          background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon style={{ color, width: "16px", height: "16px" }} />
        </div>
        {trend !== undefined && (
          <span style={{
            fontSize: "11px", fontWeight: 700,
            color: trend >= 80 ? "#10b981" : trend >= 60 ? "#f59e0b" : "#ef4444",
          }}>
            {trend}%
          </span>
        )}
      </div>
      <div style={{ fontSize: "22px", fontWeight: "700", color: "#f1f5f9", lineHeight: 1, marginBottom: "4px" }}>
        {value}
      </div>
      <div style={{ fontSize: "10px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1.2px", color: "#475569", marginBottom: "2px" }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>{subtitle}</div>
      )}
    </div>
  );
}

function SLADonut({ data }) {
  const chartData = [
    { name: "On Time", value: data.on_time || 0, key: "on_time" },
    { name: "Breached", value: data.breached || 0, key: "breached" },
    { name: "Pending", value: data.pending || 0, key: "pending" },
  ].filter(d => d.value > 0);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return <div style={{ textAlign: "center", color: "#475569", padding: "30px" }}>No SLA data</div>;
  }

  return (
    <div>
      <div style={{ position: "relative", width: "100%", height: "160px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={70}
              paddingAngle={3}
              dataKey="value"
              animationBegin={200}
              animationDuration={1000}
              stroke="none"
            >
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={DONUT_COLORS[entry.key] || "#475569"} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#f1f5f9" }}>{total}</div>
          <div style={{ fontSize: "8px", color: "#475569", textTransform: "uppercase", letterSpacing: "1px" }}>Total</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: "14px", marginTop: "6px" }}>
        {chartData.map((d) => (
          <div key={d.key} className="flex items-center gap-1.5">
            <div style={{ width: "7px", height: "7px", borderRadius: "2px", background: DONUT_COLORS[d.key] }} />
            <span style={{ fontSize: "10px", color: "#94a3b8" }}>{d.name}</span>
            <span style={{ fontSize: "10px", fontWeight: "700", color: "#f1f5f9" }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyTrend({ data }) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data.map(d => d.compliance));
  const min = Math.min(...data.map(d => d.compliance));
  const range = max - min || 1;

  return (
    <div style={{ marginTop: "12px" }}>
      <div style={{ fontSize: "10px", color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
        Weekly Compliance Trend
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "48px" }}>
        {data.map((d, i) => {
          const height = Math.max(6, ((d.compliance - min) / range) * 42);
          const color = d.compliance >= 85 ? "#10b981" : d.compliance >= 70 ? "#FF6B35" : "#8B0000";
          return (
            <div key={d.week} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
              <div
                title={`${d.week}: ${d.compliance}%`}
                style={{
                  width: "100%", maxWidth: "24px", height: `${height}px`, borderRadius: "3px 3px 0 0",
                  background: color, opacity: 0.85, transition: "height 0.3s ease",
                }}
              />
              <span style={{ fontSize: "7px", color: "#475569" }}>{d.week.split(" ")[0]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SLAComplianceWidget() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/sla-metrics`, { withCredentials: true });
      setMetrics(data);
    } catch (err) {
      logger.error("Failed to fetch SLA metrics:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  if (loading) {
    return (
      <div className="card-aml" data-testid="sla-widget" style={{ padding: "40px", textAlign: "center" }}>
        <div style={{ color: "#475569" }}>Loading SLA metrics...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="card-aml" data-testid="sla-widget" style={{ padding: "40px", textAlign: "center" }}>
        <div style={{ color: "#475569" }}>SLA data unavailable</div>
      </div>
    );
  }

  const scr = metrics.screening_turnaround;
  const caseRes = metrics.case_resolution;
  const esc = metrics.escalation;

  return (
    <div data-testid="sla-widget">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 style={{ fontSize: "14px", fontWeight: "700", color: "#f1f5f9", marginBottom: "2px" }}>
            SLA Compliance Monitor
          </h2>
          <p style={{ fontSize: "11px", color: "#475569" }}>RBI regulatory compliance tracking</p>
        </div>
        <div style={{
          fontSize: "9px", fontWeight: 700, padding: "3px 8px", borderRadius: "4px",
          background: "rgba(37,99,235,0.12)", color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.5px",
        }}>
          Live
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="flex gap-3 mb-4" style={{ display: "flex" }}>
        <SLAMetricCard
          testId="sla-turnaround-card"
          title="Screening Turnaround"
          value={`${scr.avg_hours}h`}
          subtitle={`Target: ${scr.target_hrs}h | ${scr.on_time}/${scr.total} on time`}
          icon={Clock}
          color="#FF6B35"
          trend={scr.compliance_pct}
        />
        <SLAMetricCard
          testId="sla-resolution-card"
          title="Case Resolution"
          value={`${Math.round(caseRes.avg_hours / 24)}d`}
          subtitle={`Target: ${Math.round(caseRes.target_hrs / 24)}d | ${caseRes.resolved_on_time}/${caseRes.total} on time`}
          icon={CheckCircle}
          color="#10b981"
          trend={caseRes.compliance_pct}
        />
        <SLAMetricCard
          testId="sla-escalation-card"
          title="Pending Escalations"
          value={esc.pending}
          subtitle={`${esc.count} total | SAR target: ${esc.sar_target_hrs}h`}
          icon={AlertTriangle}
          color="#8B0000"
        />
      </div>

      {/* Donut + Trend Row */}
      <div className="grid grid-cols-2 gap-4">
        <div style={{ background: "#080c12", borderRadius: "8px", padding: "14px" }}>
          <div style={{ fontSize: "10px", color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
            SLA Adherence
          </div>
          <SLADonut data={metrics.donut} />
        </div>
        <div style={{ background: "#080c12", borderRadius: "8px", padding: "14px" }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp style={{ width: "13px", height: "13px", color: "#FFD700" }} />
            <span style={{ fontSize: "10px", color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>
              Compliance Score
            </span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#f1f5f9", marginBottom: "2px" }}>
            {metrics.weekly_trend.length > 0 ? `${metrics.weekly_trend[metrics.weekly_trend.length - 1].compliance}%` : "—"}
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8" }}>Current week compliance rate</div>
          <WeeklyTrend data={metrics.weekly_trend} />
        </div>
      </div>
    </div>
  );
}
