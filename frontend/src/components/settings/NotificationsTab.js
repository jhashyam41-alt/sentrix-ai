import React, { useState } from "react";
import axios from "axios";
import logger from "../../utils/logger";
import { Save, AlertTriangle, Briefcase, FileText, BarChart3 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const NOTIFICATION_OPTIONS = [
  { key: "high_risk_screening", label: "New High-Risk Screening", desc: "Get notified when a screening result returns a high-risk score (>60).", icon: AlertTriangle, color: "#ef4444" },
  { key: "case_escalated", label: "Case Escalated", desc: "Alert when a case is escalated to senior review or MLRO.", icon: Briefcase, color: "#f59e0b" },
  { key: "daily_summary", label: "Daily Summary Report", desc: "Receive a daily digest of all compliance activities and pending items.", icon: FileText, color: "#2563eb" },
  { key: "api_usage_threshold", label: "API Usage Threshold Reached", desc: "Notify when API usage exceeds 80% of the allocated rate limit.", icon: BarChart3, color: "#a855f7" },
];

export function NotificationsTab({ settings, onRefresh }) {
  const notifs = settings?.notifications || {};
  const [toggles, setToggles] = useState({
    high_risk_screening: notifs.high_risk_screening ?? true,
    case_escalated: notifs.case_escalated ?? true,
    daily_summary: notifs.daily_summary ?? false,
    api_usage_threshold: notifs.api_usage_threshold ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleToggle = (key) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings/notifications`, toggles, { withCredentials: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onRefresh();
    } catch (err) {
      logger.error("Failed to save notifications:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: "#0d1117", border: "1px solid #1e2530", borderRadius: "12px", padding: "28px" }}>
      <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#f1f5f9", marginBottom: "6px" }}>Email Notifications</h3>
      <p style={{ fontSize: "12px", color: "#475569", marginBottom: "24px" }}>Configure which events trigger email alerts to your compliance team.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {NOTIFICATION_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isOn = toggles[opt.key];
          return (
            <div
              key={opt.key}
              data-testid={`notification-${opt.key}`}
              onClick={() => handleToggle(opt.key)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px", borderRadius: "10px", cursor: "pointer",
                background: isOn ? "rgba(37, 99, 235, 0.04)" : "transparent",
                border: `1px solid ${isOn ? "rgba(37, 99, 235, 0.15)" : "transparent"}`,
                transition: "all 0.15s",
              }}
            >
              <div className="flex items-center gap-3">
                <div style={{
                  width: "36px", height: "36px", borderRadius: "8px",
                  background: `${opt.color}12`, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon style={{ width: "16px", height: "16px", color: opt.color }} />
                </div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9" }}>{opt.label}</div>
                  <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>{opt.desc}</div>
                </div>
              </div>

              <div style={{
                width: "44px", height: "24px", borderRadius: "12px",
                background: isOn ? "#2563eb" : "#1e2530",
                position: "relative", transition: "background 0.2s", flexShrink: 0,
              }}>
                <div style={{
                  width: "18px", height: "18px", borderRadius: "50%", background: "#fff",
                  position: "absolute", top: "3px",
                  left: isOn ? "23px" : "3px",
                  transition: "left 0.2s",
                }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end mt-6">
        <button onClick={handleSave} disabled={saving} data-testid="save-notifications-btn" style={{
          background: saved ? "rgba(16,185,129,0.15)" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
          border: saved ? "1px solid rgba(16,185,129,0.4)" : "none",
          borderRadius: "8px", padding: "10px 20px",
          color: saved ? "#10b981" : "#fff", fontSize: "13px", fontWeight: "600",
          cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
        }}>
          <Save style={{ width: "14px", height: "14px" }} />
          {saving ? "Saving..." : saved ? "Saved" : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}
