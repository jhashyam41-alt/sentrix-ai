/**
 * Shared color/style utilities to eliminate repeated nested ternaries
 * for risk scores, risk levels, and step states across the app.
 */

const RISK_SCORE_COLORS = [
  { max: 25, color: "#10b981" },
  { max: 50, color: "#f59e0b" },
  { max: 75, color: "#ef4444" },
  { max: Infinity, color: "#dc2626" },
];

export function riskScoreColor(score) {
  for (const tier of RISK_SCORE_COLORS) {
    if (score <= tier.max) return tier.color;
  }
  return "#dc2626";
}

const RISK_LEVEL_COLORS = {
  LOW: "#10b981",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
  CRITICAL: "#dc2626",
};

export function riskLevelColor(level) {
  return RISK_LEVEL_COLORS[level] || "#475569";
}

const STEP_STYLES = {
  done: { bg: "rgba(16,185,129,0.15)", color: "#10b981", fontWeight: 600 },
  active: { bg: "rgba(37,99,235,0.15)", color: "#f1f5f9", fontWeight: 400 },
  pending: { bg: "#1e2530", color: "#475569", fontWeight: 400 },
};

export function stepStyle(done, active) {
  if (done) return STEP_STYLES.done;
  if (active) return STEP_STYLES.active;
  return STEP_STYLES.pending;
}
