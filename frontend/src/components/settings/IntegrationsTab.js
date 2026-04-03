import React, { useState } from "react";
import axios from "axios";
import logger from "../../utils/logger";
import { Zap, Shield, FileSearch, ToggleLeft, ToggleRight } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PROVIDERS = [
  { key: "signzy", name: "Signzy", desc: "KYC verification — PAN, Aadhaar, Passport, Voter ID, Driving License", icon: Shield, accent: "#2563eb" },
  { key: "opensanctions", name: "OpenSanctions", desc: "Global sanctions, PEP, and watchlist screening database", icon: FileSearch, accent: "#ef4444" },
  { key: "sanction_scanner", name: "Sanction Scanner", desc: "Real-time sanctions and compliance screening provider", icon: Zap, accent: "#f59e0b" },
];

const statusConfig = {
  connected: { label: "Connected", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  demo: { label: "Demo Mode", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  disconnected: { label: "Disconnected", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  error: { label: "Error", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

export function IntegrationsTab({ settings, onRefresh }) {
  const integrations = settings?.integrations || {};
  const [testing, setTesting] = useState(null);
  const [localKeys, setLocalKeys] = useState({});
  const [saving, setSaving] = useState(null);

  const handleToggle = async (provider, currentEnabled) => {
    try {
      await axios.put(`${API}/settings/integrations/${provider}`, { enabled: !currentEnabled }, { withCredentials: true });
      onRefresh();
    } catch (err) {
      logger.error("Failed to toggle integration:", err);
    }
  };

  const handleSaveKey = async (provider) => {
    const key = localKeys[provider];
    if (key === undefined) return;
    setSaving(provider);
    try {
      await axios.put(`${API}/settings/integrations/${provider}`, { api_key: key }, { withCredentials: true });
      onRefresh();
    } catch (err) {
      logger.error("Failed to save API key:", err);
    } finally {
      setSaving(null);
    }
  };

  const handleTest = async (provider) => {
    setTesting(provider);
    try {
      await axios.post(`${API}/settings/integrations/${provider}/test`, {}, { withCredentials: true });
      onRefresh();
    } catch (err) {
      logger.error("Test connection failed:", err);
    } finally {
      setTesting(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {PROVIDERS.map((p) => {
        const config = integrations[p.key] || {};
        const status = statusConfig[config.status] || statusConfig.disconnected;
        const Icon = p.icon;
        const isEnabled = config.enabled !== false;
        const currentKey = localKeys[p.key] ?? config.api_key ?? "";

        return (
          <div key={p.key} data-testid={`integration-card-${p.key}`} style={{
            background: "#0d1117", border: "1px solid #1e2530", borderRadius: "12px", padding: "24px",
            opacity: isEnabled ? 1 : 0.6, transition: "opacity 0.2s",
          }}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div style={{
                  width: "42px", height: "42px", borderRadius: "10px",
                  background: `${p.accent}12`, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon style={{ width: "20px", height: "20px", color: p.accent }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#f1f5f9" }}>{p.name}</span>
                    <span data-testid={`status-${p.key}`} style={{
                      fontSize: "10px", fontWeight: "700", color: status.color, background: status.bg,
                      padding: "2px 8px", borderRadius: "4px",
                    }}>
                      {status.label}
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>{p.desc}</p>
                </div>
              </div>

              <button
                onClick={() => handleToggle(p.key, isEnabled)}
                data-testid={`toggle-${p.key}`}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px" }}
              >
                {isEnabled
                  ? <ToggleRight style={{ width: "28px", height: "28px", color: "#2563eb" }} />
                  : <ToggleLeft style={{ width: "28px", height: "28px", color: "#475569" }} />
                }
              </button>
            </div>

            {isEnabled && (
              <div className="flex items-center gap-3">
                <input
                  value={currentKey}
                  onChange={(e) => setLocalKeys(p2 => ({ ...p2, [p.key]: e.target.value }))}
                  placeholder={`Enter ${p.name} API key...`}
                  data-testid={`apikey-input-${p.key}`}
                  type="password"
                  style={{
                    flex: 1, background: "#080c12", border: "1px solid #1e2530",
                    borderRadius: "8px", padding: "9px 14px", color: "#f1f5f9", fontSize: "13px",
                  }}
                />
                <button
                  onClick={() => handleSaveKey(p.key)}
                  disabled={saving === p.key}
                  data-testid={`save-key-${p.key}`}
                  style={{
                    background: "#1e2530", border: "none", borderRadius: "8px", padding: "9px 16px",
                    color: "#94a3b8", fontSize: "12px", fontWeight: "600", cursor: "pointer",
                  }}
                >
                  {saving === p.key ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => handleTest(p.key)}
                  disabled={testing === p.key}
                  data-testid={`test-${p.key}`}
                  style={{
                    background: "rgba(37, 99, 235, 0.1)", border: "1px solid rgba(37, 99, 235, 0.3)",
                    borderRadius: "8px", padding: "9px 16px",
                    color: "#2563eb", fontSize: "12px", fontWeight: "600", cursor: "pointer",
                  }}
                >
                  {testing === p.key ? "Testing..." : "Test Connection"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
