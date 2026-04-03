import React from "react";
import { CheckCircle, AlertTriangle, Search, UserPlus, LogIn, Flag, Settings as SettingsIcon, Key } from "lucide-react";

const iconMap = {
  screening_run: { Icon: Search, color: "#2563eb" },
  quick_screening_run: { Icon: Search, color: "#2563eb" },
  case_created: { Icon: AlertTriangle, color: "#f59e0b" },
  case_resolved: { Icon: CheckCircle, color: "#10b981" },
  customer_created: { Icon: UserPlus, color: "#14b8a6" },
  customer_updated: { Icon: UserPlus, color: "#14b8a6" },
  user_login: { Icon: LogIn, color: "#64748b" },
  sar_filed: { Icon: Flag, color: "#ef4444" },
  sar_report_generated: { Icon: Flag, color: "#ef4444" },
  case_status_changed: { Icon: AlertTriangle, color: "#f59e0b" },
  case_assigned: { Icon: AlertTriangle, color: "#f59e0b" },
  api_key_created: { Icon: Key, color: "#a855f7" },
  settings_changed: { Icon: SettingsIcon, color: "#64748b" },
};

function timeAgo(timestamp) {
  const diff = (Date.now() - new Date(timestamp).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function ActivityFeed({ feed }) {
  if (!feed || feed.length === 0) {
    return <div style={{ textAlign: "center", color: "#475569", padding: "30px", fontSize: "12px" }}>No recent activity</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      {feed.map((item, idx) => {
        const iconConf = iconMap[item.action_type] || { Icon: CheckCircle, color: "#64748b" };
        const { Icon, color } = iconConf;
        const displayName = item.customer_name || item.user_name;

        return (
          <div
            key={item.id || idx}
            data-testid={`feed-item-${idx}`}
            style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "10px 12px", borderRadius: "8px",
              transition: "background 0.15s",
              animation: `feedSlideIn 0.3s ease ${idx * 0.05}s both`,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#131923"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{
              width: "30px", height: "30px", borderRadius: "8px", flexShrink: 0,
              background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon style={{ width: "14px", height: "14px", color }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "12px", color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <span style={{ fontWeight: "600" }}>{displayName}</span>
                <span style={{ color: "#475569" }}> — </span>
                <span style={{ color: "#94a3b8" }}>{item.action}</span>
              </div>
            </div>
            <span style={{ fontSize: "10px", color: "#475569", whiteSpace: "nowrap", flexShrink: 0 }}>
              {timeAgo(item.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
