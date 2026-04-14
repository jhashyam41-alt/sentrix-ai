import React, { useState, useMemo } from "react";
import axios from "axios";
import { Clock, Shield, AlertTriangle, Zap, Save, RotateCcw } from "lucide-react";
import logger from "../../utils/logger";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RBI_DEFAULTS = {
  screening_target_hrs: 2,
  case_resolution_target_hrs: 168,
  str_filing_target_days: 7,
  edd_completion_target_days: 7,
  sar_filing_target_hrs: 24,
  auto_escalate_on_breach: true,
  template: "rbi_defaults",
};

const FIELDS = [
  {
    key: "screening_target_hrs",
    label: "KYC Screening Turnaround",
    description: "Maximum time allowed for new customer screening completion",
    unit: "hours",
    icon: Clock,
    color: "#FF6B35",
    rbiNote: "RBI mandates < 2 hours for new customers",
  },
  {
    key: "case_resolution_target_hrs",
    label: "Case Resolution Target",
    description: "Maximum time to resolve flagged compliance cases",
    unit: "hours",
    icon: Shield,
    color: "#2563eb",
    rbiNote: "STR filing within 7 days (168 hrs) of suspicion",
    displayDays: true,
  },
  {
    key: "str_filing_target_days",
    label: "STR Filing Deadline",
    description: "Days to file Suspicious Transaction Report after detection",
    unit: "days",
    icon: AlertTriangle,
    color: "#8B0000",
    rbiNote: "RBI mandates STR filing within 7 days",
  },
  {
    key: "edd_completion_target_days",
    label: "EDD Completion Target",
    description: "Working days to complete Enhanced Due Diligence",
    unit: "days",
    icon: Shield,
    color: "#FFD700",
    rbiNote: "< 7 working days per RBI guidelines",
  },
  {
    key: "sar_filing_target_hrs",
    label: "SAR/STR Filing After Escalation",
    description: "Hours to file SAR after a case is escalated",
    unit: "hours",
    icon: Zap,
    color: "#ef4444",
    rbiNote: "< 24 hours after case escalation",
  },
];

export function SLATab({ settings, onRefresh }) {
  const existing = useMemo(() => settings?.sla_config || {}, [settings]);

  const [config, setConfig] = useState({
    screening_target_hrs: existing.screening_target_hrs ?? RBI_DEFAULTS.screening_target_hrs,
    case_resolution_target_hrs: existing.case_resolution_target_hrs ?? RBI_DEFAULTS.case_resolution_target_hrs,
    str_filing_target_days: existing.str_filing_target_days ?? RBI_DEFAULTS.str_filing_target_days,
    edd_completion_target_days: existing.edd_completion_target_days ?? RBI_DEFAULTS.edd_completion_target_days,
    sar_filing_target_hrs: existing.sar_filing_target_hrs ?? RBI_DEFAULTS.sar_filing_target_hrs,
    auto_escalate_on_breach: existing.auto_escalate_on_breach ?? RBI_DEFAULTS.auto_escalate_on_breach,
    template: existing.template || "",
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value, template: "" }));
    setSaved(false);
  };

  const applyRBIDefaults = () => {
    setConfig({ ...RBI_DEFAULTS });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings/sla`, config, { withCredentials: true });
      setSaved(true);
      onRefresh();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      logger.error("Failed to save SLA config:", err);
    } finally {
      setSaving(false);
    }
  };

  const isRBIActive = config.template === "rbi_defaults" ||
    (config.screening_target_hrs === 2 && config.case_resolution_target_hrs === 168 &&
     config.str_filing_target_days === 7 && config.edd_completion_target_days === 7 &&
     config.sar_filing_target_hrs === 24);

  return (
    <div data-testid="sla-settings-tab">
      {/* RBI Template Card */}
      <div style={{
        background: isRBIActive ? "rgba(37,99,235,0.08)" : "#0d1117",
        border: `1px solid ${isRBIActive ? "rgba(37,99,235,0.35)" : "#1e2530"}`,
        borderRadius: "12px", padding: "20px", marginBottom: "24px",
        transition: "all 0.2s",
      }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{
              width: "42px", height: "42px", borderRadius: "10px",
              background: "rgba(37,99,235,0.15)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Shield style={{ width: "20px", height: "20px", color: "#2563eb" }} />
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#f1f5f9" }}>RBI Compliance Defaults</div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                Pre-configured targets based on RBI AML/KYC circulars
              </div>
            </div>
          </div>
          <button
            onClick={applyRBIDefaults}
            data-testid="apply-rbi-defaults-btn"
            style={{
              background: isRBIActive ? "rgba(16,185,129,0.12)" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
              border: isRBIActive ? "1px solid rgba(16,185,129,0.3)" : "none",
              borderRadius: "8px", padding: "8px 20px", cursor: "pointer",
              color: isRBIActive ? "#10b981" : "#fff", fontSize: "12px", fontWeight: 600,
              display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s",
            }}
          >
            {isRBIActive ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Active
              </>
            ) : (
              <>
                <RotateCcw style={{ width: "13px", height: "13px" }} />
                Apply RBI Defaults
              </>
            )}
          </button>
        </div>

        {/* RBI Summary Pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            "KYC Screening < 2hrs",
            "STR Filing < 7 days",
            "EDD < 7 working days",
            "SAR < 24hrs post-escalation",
          ].map((label) => (
            <span key={label} style={{
              fontSize: "10px", fontWeight: 600, padding: "3px 10px", borderRadius: "20px",
              background: "rgba(37,99,235,0.08)", color: "#60a5fa",
              border: "1px solid rgba(37,99,235,0.2)",
            }}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* SLA Fields */}
      <div className="space-y-4">
        {FIELDS.map((field) => {
          const Icon = field.icon;
          return (
            <div key={field.key} data-testid={`sla-field-${field.key}`} style={{
              background: "#0d1117", border: "1px solid #1e2530", borderRadius: "10px", padding: "18px",
            }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3" style={{ flex: 1 }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "8px",
                    background: `${field.color}15`, display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Icon style={{ width: "16px", height: "16px", color: field.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9" }}>{field.label}</div>
                    <div style={{ fontSize: "11px", color: "#475569" }}>{field.description}</div>
                    <div style={{ fontSize: "10px", color: "#FF6B35", marginTop: "2px", fontStyle: "italic" }}>
                      {field.rbiNote}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step={field.unit === "hours" ? "0.5" : "1"}
                    min="0.5"
                    value={config[field.key]}
                    onChange={(e) => handleChange(field.key, parseFloat(e.target.value) || 0)}
                    data-testid={`sla-input-${field.key}`}
                    style={{
                      width: "80px", background: "#080c12", border: "1px solid #1e2530",
                      borderRadius: "6px", padding: "8px 10px", color: "#f1f5f9",
                      fontSize: "14px", fontWeight: 700, textAlign: "center",
                      outline: "none",
                    }}
                  />
                  <span style={{ fontSize: "11px", color: "#475569", width: "40px" }}>{field.unit}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Auto-Escalation Toggle */}
      <div style={{
        background: "#0d1117", border: "1px solid #1e2530", borderRadius: "10px",
        padding: "18px", marginTop: "16px",
      }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{
              width: "36px", height: "36px", borderRadius: "8px",
              background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Zap style={{ width: "16px", height: "16px", color: "#ef4444" }} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9" }}>Auto-Escalation on Breach</div>
              <div style={{ fontSize: "11px", color: "#475569" }}>
                Automatically escalate cases when SLA targets are breached
              </div>
            </div>
          </div>
          <button
            onClick={() => handleChange("auto_escalate_on_breach", !config.auto_escalate_on_breach)}
            data-testid="sla-auto-escalate-toggle"
            style={{
              width: "44px", height: "24px", borderRadius: "12px", border: "none",
              background: config.auto_escalate_on_breach ? "#2563eb" : "#1e2530",
              cursor: "pointer", position: "relative", transition: "background 0.2s",
            }}
          >
            <div style={{
              width: "18px", height: "18px", borderRadius: "50%", background: "#fff",
              position: "absolute", top: "3px",
              left: config.auto_escalate_on_breach ? "23px" : "3px",
              transition: "left 0.2s",
            }} />
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          data-testid="sla-save-btn"
          style={{
            background: saved ? "rgba(16,185,129,0.12)" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
            border: saved ? "1px solid rgba(16,185,129,0.3)" : "none",
            borderRadius: "8px", padding: "10px 28px", cursor: saving ? "not-allowed" : "pointer",
            color: saved ? "#10b981" : "#fff", fontSize: "13px", fontWeight: 600,
            display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s",
            opacity: saving ? 0.7 : 1,
          }}
        >
          <Save style={{ width: "14px", height: "14px" }} />
          {saving ? "Saving..." : saved ? "Saved" : "Save SLA Configuration"}
        </button>
      </div>
    </div>
  );
}
