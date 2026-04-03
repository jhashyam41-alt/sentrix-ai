import React from "react";

const RISK_COLORS = {
  LOW: { stroke: "#10b981", bg: "rgba(16,185,129,0.12)", text: "#10b981" },
  MEDIUM: { stroke: "#f59e0b", bg: "rgba(245,158,11,0.12)", text: "#f59e0b" },
  HIGH: { stroke: "#ef4444", bg: "rgba(239,68,68,0.12)", text: "#ef4444" },
  CRITICAL: { stroke: "#dc2626", bg: "rgba(220,38,38,0.18)", text: "#dc2626" },
};

export function RiskScoreCircle({ score, level, size = 140 }) {
  const colors = RISK_COLORS[level] || RISK_COLORS.LOW;
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const center = size / 2;

  return (
    <div style={{ position: "relative", width: size, height: size }} data-testid="risk-score-circle">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={center} cy={center} r={radius}
          fill="none" stroke="#1e2530" strokeWidth="8" />
        <circle cx={center} cy={center} r={radius}
          fill="none" stroke={colors.stroke} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: "stroke-dashoffset 1.2s ease-out" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 800, color: colors.text, lineHeight: 1 }}>
          {score}
        </span>
        <span style={{ fontSize: 10, color: "#475569", fontWeight: 600, marginTop: 2 }}>/ 100</span>
      </div>
    </div>
  );
}

export function RiskLevelBadge({ level }) {
  const colors = RISK_COLORS[level] || RISK_COLORS.LOW;
  return (
    <span data-testid="risk-level-badge" style={{
      fontSize: "11px", fontWeight: 700, padding: "4px 12px", borderRadius: "6px",
      color: colors.text, background: colors.bg, textTransform: "uppercase", letterSpacing: "0.5px",
    }}>
      {level}
    </span>
  );
}
