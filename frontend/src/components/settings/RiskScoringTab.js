import React, { useState, useMemo } from "react";
import axios from "axios";
import logger from "../../utils/logger";
import { Save, AlertTriangle } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const WEIGHT_CONFIG = [
  { key: "kyc_failure_weight", label: "KYC Failure Weight", max: 40, color: "#2563eb", desc: "Weight applied when KYC verification fails" },
  { key: "sanctions_match_weight", label: "Sanctions Match Weight", max: 40, color: "#ef4444", desc: "Weight for confirmed or potential sanctions matches" },
  { key: "pep_match_weight", label: "PEP Match Weight", max: 30, color: "#f59e0b", desc: "Weight for politically exposed person matches" },
  { key: "adverse_media_weight", label: "Adverse Media Weight", max: 20, color: "#a855f7", desc: "Weight for negative news or media findings" },
  { key: "country_risk_weight", label: "Country Risk Weight", max: 15, color: "#14b8a6", desc: "Weight based on country/jurisdiction risk level" },
];

const SAMPLE_PROFILES = [
  { name: "Low Risk (Clean)", factors: { kyc: 0, sanctions: 0, pep: 0, media: 0, country: 0.3 } },
  { name: "Medium Risk (PEP Match)", factors: { kyc: 0, sanctions: 0, pep: 1, media: 0, country: 0.4 } },
  { name: "High Risk (Multi-Flag)", factors: { kyc: 0.5, sanctions: 1, pep: 1, media: 0.7, country: 0.8 } },
];

export function RiskScoringTab({ settings, onRefresh }) {
  const rs = settings?.risk_scoring || {};
  const [weights, setWeights] = useState({
    kyc_failure_weight: rs.kyc_failure_weight ?? 25,
    sanctions_match_weight: rs.sanctions_match_weight ?? 30,
    pep_match_weight: rs.pep_match_weight ?? 20,
    adverse_media_weight: rs.adverse_media_weight ?? 15,
    country_risk_weight: rs.country_risk_weight ?? 10,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const totalWeight = useMemo(() => Object.values(weights).reduce((a, b) => a + b, 0), [weights]);

  const calcScore = (factors) => {
    const raw = (
      factors.kyc * weights.kyc_failure_weight +
      factors.sanctions * weights.sanctions_match_weight +
      factors.pep * weights.pep_match_weight +
      factors.media * weights.adverse_media_weight +
      factors.country * weights.country_risk_weight
    );
    return Math.min(100, Math.round((raw / Math.max(totalWeight, 1)) * 100));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings/risk-scoring`, weights, { withCredentials: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onRefresh();
    } catch (err) {
      logger.error("Failed to save risk weights:", err);
    } finally {
      setSaving(false);
    }
  };

  const scoreColor = (score) => score > 60 ? "#ef4444" : score > 30 ? "#f59e0b" : "#10b981";

  return (
    <div style={{ display: "flex", gap: "20px" }}>
      {/* Sliders Panel */}
      <div style={{ flex: 1, background: "#0d1117", border: "1px solid #1e2530", borderRadius: "12px", padding: "28px" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#f1f5f9" }}>Risk Weight Configuration</h3>
          <span style={{
            fontSize: "11px", fontWeight: "700", padding: "4px 10px", borderRadius: "6px",
            color: totalWeight > 100 ? "#ef4444" : "#10b981",
            background: totalWeight > 100 ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
          }}>
            Total: {totalWeight}/145 max
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {WEIGHT_CONFIG.map((w) => (
            <div key={w.key}>
              <div className="flex items-center justify-between mb-1">
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#f1f5f9" }}>{w.label}</label>
                <span style={{ fontSize: "13px", fontWeight: "700", color: w.color }}>{weights[w.key]}</span>
              </div>
              <p style={{ fontSize: "10px", color: "#475569", marginBottom: "6px" }}>{w.desc}</p>
              <div style={{ position: "relative" }}>
                <input
                  type="range"
                  min={0}
                  max={w.max}
                  value={weights[w.key]}
                  onChange={(e) => setWeights(p => ({ ...p, [w.key]: parseInt(e.target.value) }))}
                  data-testid={`slider-${w.key}`}
                  style={{
                    width: "100%", height: "6px", appearance: "none", background: "#1e2530",
                    borderRadius: "3px", outline: "none", cursor: "pointer",
                    accentColor: w.color,
                  }}
                />
                <div className="flex justify-between" style={{ fontSize: "9px", color: "#475569", marginTop: "2px" }}>
                  <span>0</span><span>{w.max}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-6">
          <button onClick={handleSave} disabled={saving} data-testid="save-risk-btn" style={{
            background: saved ? "rgba(16,185,129,0.15)" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
            border: saved ? "1px solid rgba(16,185,129,0.4)" : "none",
            borderRadius: "8px", padding: "10px 20px",
            color: saved ? "#10b981" : "#fff", fontSize: "13px", fontWeight: "600",
            cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
          }}>
            <Save style={{ width: "14px", height: "14px" }} />
            {saving ? "Saving..." : saved ? "Saved" : "Save Weights"}
          </button>
        </div>
      </div>

      {/* Preview Panel */}
      <div style={{ width: "340px", background: "#0d1117", border: "1px solid #1e2530", borderRadius: "12px", padding: "28px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#f1f5f9", marginBottom: "16px" }}>Score Preview</h3>
        <p style={{ fontSize: "11px", color: "#475569", marginBottom: "20px" }}>See how current weights affect sample customer profiles.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {SAMPLE_PROFILES.map((profile) => {
            const score = calcScore(profile.factors);
            const color = scoreColor(score);
            return (
              <div key={profile.name} data-testid={`preview-${profile.name.split(" ")[0].toLowerCase()}`} style={{
                background: "#080c12", border: "1px solid #1e2530", borderRadius: "10px", padding: "14px",
              }}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "#f1f5f9" }}>{profile.name}</span>
                  <span style={{ fontSize: "16px", fontWeight: "700", color }}>{score}</span>
                </div>
                <div style={{
                  height: "6px", background: "#1e2530", borderRadius: "3px", overflow: "hidden",
                }}>
                  <div style={{
                    width: `${score}%`, height: "100%", background: color,
                    borderRadius: "3px", transition: "width 0.3s ease",
                  }} />
                </div>
                <div style={{ fontSize: "10px", color: "#475569", marginTop: "4px" }}>
                  {score <= 30 ? "Low Risk" : score <= 60 ? "Medium Risk" : "High Risk"}
                </div>
              </div>
            );
          })}
        </div>

        {totalWeight > 100 && (
          <div className="flex items-center gap-2 mt-4" style={{
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "8px", padding: "10px",
          }}>
            <AlertTriangle style={{ width: "14px", height: "14px", color: "#ef4444", flexShrink: 0 }} />
            <span style={{ fontSize: "11px", color: "#ef4444" }}>High total weight may inflate scores.</span>
          </div>
        )}
      </div>
    </div>
  );
}
