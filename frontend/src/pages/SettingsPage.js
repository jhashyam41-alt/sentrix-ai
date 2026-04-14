import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import logger from "../utils/logger";
import { GeneralTab } from "../components/settings/GeneralTab";
import { RiskScoringTab } from "../components/settings/RiskScoringTab";
import { IntegrationsTab } from "../components/settings/IntegrationsTab";
import { NotificationsTab } from "../components/settings/NotificationsTab";
import { TeamTab } from "../components/settings/TeamTab";
import { ComplianceTab } from "../components/settings/ComplianceTab";
import { SLATab } from "../components/settings/SLATab";
import { Settings, Sliders, Plug, Bell, Users, ShieldCheck, Clock } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TABS = [
  { id: "general", label: "General", icon: Settings },
  { id: "risk", label: "Risk Scoring", icon: Sliders },
  { id: "sla", label: "SLA Targets", icon: Clock },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "team", label: "Team Members", icon: Users },
  { id: "compliance", label: "Compliance Rules", icon: ShieldCheck },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState(null);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/settings`, { withCredentials: true });
      setSettings(data);
    } catch (err) {
      logger.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeam = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/settings/team`, { withCredentials: true });
      setTeam(data.members || []);
    } catch (err) {
      logger.error("Failed to fetch team:", err);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchTeam();
  }, [fetchSettings, fetchTeam]);

  if (loading) {
    return <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>Loading settings...</div>;
  }

  const tabProps = { settings, onRefresh: fetchSettings, team, onRefreshTeam: fetchTeam };

  return (
    <div>
      <div className="mb-6">
        <h1 data-testid="settings-title" style={{ fontSize: "26px", fontWeight: "700", letterSpacing: "-0.5px", color: "#f1f5f9", marginBottom: "4px" }}>
          Settings
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "14px" }}>Configure platform, risk scoring, integrations, and team</p>
      </div>

      {/* Tab Navigation */}
      <div data-testid="settings-tabs" style={{
        display: "flex", gap: "4px", marginBottom: "24px",
        background: "#0d1117", border: "1px solid #1e2530", borderRadius: "12px", padding: "6px",
      }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              data-testid={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: "10px 12px", borderRadius: "8px", border: "none",
                background: isActive ? "rgba(37, 99, 235, 0.12)" : "transparent",
                color: isActive ? "#2563eb" : "#94a3b8",
                fontSize: "12px", fontWeight: "600", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                transition: "all 0.15s",
              }}
            >
              <Icon style={{ width: "14px", height: "14px" }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "general" && <GeneralTab {...tabProps} />}
      {activeTab === "risk" && <RiskScoringTab {...tabProps} />}
      {activeTab === "sla" && <SLATab {...tabProps} />}
      {activeTab === "integrations" && <IntegrationsTab {...tabProps} />}
      {activeTab === "notifications" && <NotificationsTab {...tabProps} />}
      {activeTab === "team" && <TeamTab {...tabProps} />}
      {activeTab === "compliance" && <ComplianceTab {...tabProps} />}
    </div>
  );
}
