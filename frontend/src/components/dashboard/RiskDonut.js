import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const COLORS = { low: "#10b981", medium: "#f59e0b", high: "#ef4444", unacceptable: "#dc2626" };

export function RiskDonut({ data }) {
  const chartData = [
    { name: "Low", value: data.low || 0 },
    { name: "Medium", value: data.medium || 0 },
    { name: "High", value: data.high || 0 },
    { name: "Unacceptable", value: data.unacceptable || 0 },
  ].filter(d => d.value > 0);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return <div style={{ textAlign: "center", color: "#475569", padding: "40px" }}>No data</div>;
  }

  return (
    <div>
      <div style={{ position: "relative", width: "100%", height: "180px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              animationBegin={200}
              animationDuration={1200}
              stroke="none"
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={COLORS[entry.name.toLowerCase()] || "#475569"} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "22px", fontWeight: "700", color: "#f1f5f9" }}>{total}</div>
          <div style={{ fontSize: "9px", color: "#475569", textTransform: "uppercase", letterSpacing: "1px" }}>Total</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "8px" }}>
        {chartData.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: COLORS[d.name.toLowerCase()] }} />
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>{d.name}</span>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#f1f5f9" }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
