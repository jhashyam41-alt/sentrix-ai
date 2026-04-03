import React, { useState } from "react";
import axios from "axios";
import logger from "../../utils/logger";
import { Save, ShieldAlert, Zap, Ban, RefreshCw } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RULES = [
  { key: "auto_create_case_high_risk", label: "Auto-Create Case for High Risk", desc: "Automatically create a compliance case when a customer's risk score exceeds the high-risk threshold.", icon: ShieldAlert, color: "#ef4444" },
  { key: "auto_escalate_unacceptable_risk", label: "Auto-Escalate Unacceptable Risk", desc: "Immediately escalate cases to MLRO when risk is classified as unacceptable.", icon: Zap, color: "#f59e0b" },
  { key: "block_onboarding_kyc_fails", label: "Block Onboarding if KYC Fails", desc: "Prevent customer onboarding from completing when KYC verification fails.", icon: Ban, color: "#a855f7" },
];

const RESCREEN_OPTIONS = [
  { value: 30, label: "Every 30 days" },
  { value: 60, label: "Every 60 days" },
  { value: 90, label: "Every 90 days" },
];

export function ComplianceTab({ settings, onRefresh }) {
  const rules = settings?.compliance_rules || {};
  const [form, setForm] = useState({
    auto_create_case_high_risk: rules.auto_create_case_high_risk ?? true,
    auto_escalate_unacceptable_risk: rules.auto_escalate_unacceptable_risk ?? true,
    block_onboarding_kyc_fails: rules.block_onboarding_kyc_fails ?? false,
    rescreen_interval_days: rules.rescreen_interval_days ?? 90,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleToggle = (key) => {
    setForm(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings/compliance-rules`, form, { withCredentials: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onRefresh();
    } catch (err) {
      logger.error("Failed to save compliance rules:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: "#0d1117", border: "1px solid #1e2530", borderRadius: "12px", padding: "28px" }}>
      <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#f1f5f9", marginBottom: "6px" }}>Compliance Automation Rules</h3>
      <p style={{ fontSize: "12px", color: "#475569", marginBottom: "24px" }}>Enable automated compliance actions based on screening results and risk assessments.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "24px" }}>
        {RULES.map((rule) => {
          const Icon = rule.icon;
          const isOn = form[rule.key];
          return (
            <div
              key={rule.key}
              data-testid={`rule-${rule.key}`}
              onClick={() => handleToggle(rule.key)}
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
                  background: `${rule.color}12`, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon style={{ width: "16px", height: "16px", color: rule.color }} />
                </div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9" }}>{rule.label}</div>
                  <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>{rule.desc}</div>
                </div>
              </div>
              <div style={{
                width: "44px", height: "24px", borderRadius: "12px",
                background: isOn ? "#2563eb" : "#1e2530",
                position: "relative", transition: "background 0.2s", flexShrink: 0,
              }}>
                <div style={{
                  width: "18px", height: "18px", borderRadius: "50%", background: "#fff",
                  position: "absolute", top: "3px", left: isOn ? "23px" : "3px", transition: "left 0.2s",
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Re-screen Interval */}
      <div data-testid="rescreen-section" style={{
        background: "#080c12", border: "1px solid #1e2530", borderRadius: "10px", padding: "16px",
        marginBottom: "24px",
      }}>
        <div className="flex items-center gap-3 mb-3">
          <div style={{
            width: "36px", height: "36px", borderRadius: "8px",
            background: "rgba(20,184,166,0.12)", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <RefreshCw style={{ width: "16px", height: "16px", color: "#14b8a6" }} />
          </div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9" }}>Re-Screen All Customers</div>
            <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>Automatically re-run screening on all active customers at a regular interval.</div>
          </div>
        </div>
        <div className="flex gap-3">
          {RESCREEN_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              data-testid={`rescreen-${opt.value}`}
              onClick={() => setForm(p => ({ ...p, rescreen_interval_days: opt.value }))}
              style={{
                flex: 1, padding: "10px", borderRadius: "8px",
                background: form.rescreen_interval_days === opt.value ? "rgba(37,99,235,0.12)" : "transparent",
                border: `1px solid ${form.rescreen_interval_days === opt.value ? "#2563eb" : "#1e2530"}`,
                color: form.rescreen_interval_days === opt.value ? "#2563eb" : "#94a3b8",
                fontSize: "12px", fontWeight: "600", cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} data-testid="save-compliance-btn" style={{
          background: saved ? "rgba(16,185,129,0.15)" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
          border: saved ? "1px solid rgba(16,185,129,0.4)" : "none",
          borderRadius: "8px", padding: "10px 20px",
          color: saved ? "#10b981" : "#fff", fontSize: "13px", fontWeight: "600",
          cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
        }}>
          <Save style={{ width: "14px", height: "14px" }} />
          {saving ? "Saving..." : saved ? "Saved" : "Save Rules"}
        </button>
      </div>
    </div>
  );
}
