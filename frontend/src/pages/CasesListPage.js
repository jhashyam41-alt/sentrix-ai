import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import logger from "../utils/logger";
import { KanbanBoard } from "../components/cases/KanbanBoard";
import { CaseDetailPanel } from "../components/cases/CaseDetailPanel";
import { ResolutionModal } from "../components/cases/ResolutionModal";
import { AlertCircle, Shield, Flag, Clock } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CasesListPage() {
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [resolvingCase, setResolvingCase] = useState(null);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [activeDragId, setActiveDragId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [casesRes, statsRes, teamRes] = await Promise.all([
        axios.get(`${API}/cases`, { withCredentials: true }),
        axios.get(`${API}/cases/stats`, { withCredentials: true }),
        axios.get(`${API}/team-members`, { withCredentials: true }),
      ]);
      setCases(casesRes.data.cases || []);
      setStats(statsRes.data);
      setTeamMembers(teamRes.data.members || []);
    } catch (err) {
      logger.error("Failed to fetch cases data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = async (caseData, newStatus) => {
    if (newStatus === "closed") {
      setResolvingCase(caseData);
      return;
    }
    // Optimistic update
    setCases((prev) => prev.map((c) => c.id === caseData.id ? { ...c, status: newStatus } : c));
    try {
      await axios.patch(`${API}/cases/${caseData.id}/status`, { status: newStatus }, { withCredentials: true });
      await fetchData();
    } catch (err) {
      logger.error("Failed to update status", err);
      setCases((prev) => prev.map((c) => c.id === caseData.id ? { ...c, status: caseData.status } : c));
    }
  };

  const handleResolve = async (resolutionType) => {
    if (!resolvingCase) return;
    setResolveLoading(true);
    try {
      await axios.post(`${API}/cases/${resolvingCase.id}/resolve`, { resolution_type: resolutionType }, { withCredentials: true });
      setResolvingCase(null);
      await fetchData();
    } catch (err) {
      logger.error("Failed to resolve case", err);
    } finally {
      setResolveLoading(false);
    }
  };

  const statCards = [
    { label: "Total Cases", value: stats.total || 0, icon: AlertCircle, color: "#2563eb" },
    { label: "Open Alerts", value: stats.open || 0, icon: Clock, color: "#f59e0b" },
    { label: "Escalated", value: stats.escalated || 0, icon: Shield, color: "#ef4444" },
    { label: "SAR Filed", value: stats.sar_filed || 0, icon: Flag, color: "#a855f7" },
  ];

  if (loading) {
    return (
      <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
        Loading cases...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: "700", letterSpacing: "-0.5px", color: "#f1f5f9", marginBottom: "4px" }} data-testid="cases-title">
            Case Management
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>
            Drag cases between columns to update status
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div data-testid="cases-stats-bar" style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              data-testid={`stat-${s.label.toLowerCase().replace(/ /g, "-")}`}
              style={{
                flex: 1, background: "#0d1117", border: "1px solid #1e2530",
                borderRadius: "10px", padding: "16px 20px",
                display: "flex", alignItems: "center", gap: "14px",
              }}
            >
              <div style={{
                width: "40px", height: "40px", borderRadius: "10px",
                background: `${s.color}15`, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon style={{ width: "18px", height: "18px", color: s.color }} />
              </div>
              <div>
                <div style={{ fontSize: "22px", fontWeight: "700", color: "#f1f5f9" }}>{s.value}</div>
                <div style={{ fontSize: "11px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        cases={cases}
        onStatusChange={handleStatusChange}
        onCardClick={setSelectedCase}
        activeDragId={activeDragId}
        setActiveDragId={setActiveDragId}
      />

      {/* Case Detail Panel */}
      {selectedCase && (
        <CaseDetailPanel
          caseData={selectedCase}
          teamMembers={teamMembers}
          onClose={() => setSelectedCase(null)}
          onUpdate={fetchData}
        />
      )}

      {/* Resolution Modal */}
      {resolvingCase && (
        <ResolutionModal
          caseData={resolvingCase}
          onConfirm={handleResolve}
          onCancel={() => setResolvingCase(null)}
          loading={resolveLoading}
        />
      )}
    </div>
  );
}
