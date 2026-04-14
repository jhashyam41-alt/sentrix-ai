import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { Bell, AlertTriangle, X, Clock, CheckCircle } from "lucide-react";
import logger from "../../utils/logger";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SEVERITY_COLORS = {
  critical: { bg: "rgba(139,0,0,0.15)", text: "#dc2626", border: "rgba(139,0,0,0.35)" },
  high: { bg: "rgba(255,107,53,0.12)", text: "#FF6B35", border: "rgba(255,107,53,0.3)" },
  medium: { bg: "rgba(255,215,0,0.1)", text: "#FFD700", border: "rgba(255,215,0,0.25)" },
};

const TYPE_ICONS = {
  screening_turnaround: Clock,
  case_resolution: AlertTriangle,
  sar_filing: AlertTriangle,
  edd_completion: Clock,
};

export function SLABreachBell() {
  const [breaches, setBreaches] = useState([]);
  const [unacknowledged, setUnacknowledged] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const fetchBreaches = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/sla-breaches`, { withCredentials: true });
      setBreaches(data.breaches || []);
      setUnacknowledged(data.unacknowledged || 0);
    } catch (err) {
      logger.error("Failed to fetch SLA breaches:", err);
    }
  }, []);

  useEffect(() => { fetchBreaches(); }, [fetchBreaches]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleAcknowledge = async (breachId) => {
    try {
      await axios.put(`${API}/sla-breaches/${breachId}/acknowledge`, {}, { withCredentials: true });
      setBreaches(prev => prev.map(b => b.id === breachId ? { ...b, acknowledged: true } : b));
      setUnacknowledged(prev => Math.max(0, prev - 1));
    } catch (err) {
      logger.error("Failed to acknowledge breach:", err);
    }
  };

  function timeAgo(isoStr) {
    const diff = Date.now() - new Date(isoStr).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return `${Math.floor(diff / 60000)}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        data-testid="sla-breach-bell"
        style={{
          position: "relative", background: "transparent", border: "1px solid #1e2530",
          borderRadius: "8px", padding: "7px", cursor: "pointer", color: "#94a3b8",
          transition: "all 0.15s", display: "flex", alignItems: "center",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.color = "#f1f5f9"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1e2530"; e.currentTarget.style.color = "#94a3b8"; }}
      >
        <Bell style={{ width: "16px", height: "16px" }} />
        {unacknowledged > 0 && (
          <span data-testid="sla-breach-count" style={{
            position: "absolute", top: "-4px", right: "-4px", width: "16px", height: "16px",
            borderRadius: "50%", background: "#8B0000", color: "#fff",
            fontSize: "9px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #0d1117",
          }}>
            {unacknowledged}
          </span>
        )}
      </button>

      {open && (
        <div data-testid="sla-breach-dropdown" style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: 0, width: "380px",
          background: "#0d1117", border: "1px solid #1e2530", borderRadius: "12px",
          boxShadow: "0 -16px 48px rgba(0,0,0,0.5)", zIndex: 100,
          maxHeight: "420px", display: "flex", flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{
            padding: "14px 16px", borderBottom: "1px solid #1e2530",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div className="flex items-center gap-2">
              <AlertTriangle style={{ width: "14px", height: "14px", color: "#8B0000" }} />
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#f1f5f9" }}>SLA Breach Alerts</span>
              {unacknowledged > 0 && (
                <span style={{
                  fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "10px",
                  background: "rgba(139,0,0,0.2)", color: "#dc2626",
                }}>
                  {unacknowledged} new
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "#475569", padding: "2px" }}
            >
              <X style={{ width: "14px", height: "14px" }} />
            </button>
          </div>

          {/* Breach List */}
          <div style={{ overflowY: "auto", flex: 1, padding: "4px 0" }}>
            {breaches.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", color: "#475569", fontSize: "13px" }}>
                No SLA breaches
              </div>
            ) : (
              breaches.map((b) => {
                const sc = SEVERITY_COLORS[b.severity] || SEVERITY_COLORS.medium;
                const TypeIcon = TYPE_ICONS[b.type] || AlertTriangle;
                return (
                  <div key={b.id} data-testid={`breach-item-${b.id}`} style={{
                    padding: "12px 16px", borderBottom: "1px solid #0f1520",
                    opacity: b.acknowledged ? 0.55 : 1, transition: "opacity 0.2s",
                  }}>
                    <div className="flex items-start gap-3">
                      <div style={{
                        width: "28px", height: "28px", borderRadius: "6px", flexShrink: 0,
                        background: sc.bg, border: `1px solid ${sc.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <TypeIcon style={{ width: "13px", height: "13px", color: sc.text }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "#f1f5f9" }}>{b.title}</span>
                          <span style={{
                            fontSize: "8px", fontWeight: 700, padding: "1px 5px", borderRadius: "3px",
                            textTransform: "uppercase", background: sc.bg, color: sc.text,
                          }}>
                            {b.severity}
                          </span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>{b.description}</div>
                        <div className="flex items-center justify-between">
                          <span style={{ fontSize: "10px", color: "#475569" }}>{timeAgo(b.breached_at)}</span>
                          {!b.acknowledged && (
                            <button
                              onClick={() => handleAcknowledge(b.id)}
                              data-testid={`ack-breach-${b.id}`}
                              style={{
                                background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.25)",
                                borderRadius: "4px", padding: "2px 8px", cursor: "pointer",
                                color: "#60a5fa", fontSize: "10px", fontWeight: 600,
                                display: "flex", alignItems: "center", gap: "3px",
                              }}
                            >
                              <CheckCircle style={{ width: "10px", height: "10px" }} />
                              Ack
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
