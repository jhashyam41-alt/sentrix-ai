import React from "react";
import { Shield, FileSearch, Newspaper } from "lucide-react";

const PROVIDERS = [
  { key: "signzy", name: "Signzy", desc: "KYC Verification", icon: Shield, color: "#2563eb" },
  { key: "opensanctions", name: "OpenSanctions", desc: "Sanctions & PEP", icon: FileSearch, color: "#ef4444" },
  { key: "newsapi", name: "News API", desc: "Adverse Media", icon: Newspaper, color: "#a855f7" },
];

export function IntegrationCards({ integrations }) {
  return (
    <div className="space-y-3">
      {PROVIDERS.map((p) => {
        const info = integrations?.[p.key] || {};
        const isLive = info.mode === "live";
        const Icon = p.icon;
        return (
          <div key={p.key} data-testid={`dashboard-integration-${p.key}`} className="flex items-center justify-between" style={{
            padding: "12px 14px", background: "#080c12", borderRadius: "10px", border: "1px solid #1e2530",
          }}>
            <div className="flex items-center gap-3">
              <div style={{
                width: "36px", height: "36px", borderRadius: "8px",
                background: `${p.color}12`, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon style={{ width: "16px", height: "16px", color: p.color }} />
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9" }}>{p.name}</div>
                <div style={{ fontSize: "10px", color: "#475569" }}>{p.desc}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span style={{
                fontSize: "9px", fontWeight: "700", padding: "3px 8px", borderRadius: "4px",
                color: isLive ? "#10b981" : "#f59e0b",
                background: isLive ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                textTransform: "uppercase",
              }}>
                {isLive ? "Connected" : "Demo Mode"}
              </span>
              <button
                data-testid={`connect-${p.key}`}
                onClick={() => window.location.href = "/settings"}
                style={{
                  background: "transparent", border: "1px solid #1e2530", borderRadius: "6px",
                  padding: "4px 10px", color: "#94a3b8", fontSize: "10px", fontWeight: "600",
                  cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.color = "#2563eb"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1e2530"; e.currentTarget.style.color = "#94a3b8"; }}
              >
                Connect
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
