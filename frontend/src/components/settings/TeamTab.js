import React, { useState, useMemo } from "react";
import axios from "axios";
import logger from "../../utils/logger";
import { UserPlus, Pencil, Trash2, X, Send } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "compliance_officer", label: "Compliance Officer" },
  { value: "analyst", label: "Analyst" },
  { value: "read_only_auditor", label: "Viewer" },
];

const roleLabel = (role) => ROLES.find(r => r.value === role)?.label || role?.replace(/_/g, " ");

const roleBadge = (role) => {
  const colors = {
    super_admin: { color: "#2563eb", bg: "rgba(37,99,235,0.12)" },
    compliance_officer: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    analyst: { color: "#14b8a6", bg: "rgba(20,184,166,0.12)" },
    read_only_auditor: { color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  };
  return colors[role] || colors.analyst;
};

const statusBadge = (status) => {
  if (status === "invited") return { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "Invited" };
  return { color: "#10b981", bg: "rgba(16,185,129,0.12)", label: "Active" };
};

export function TeamTab({ team, onRefreshTeam }) {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "analyst" });
  const [inviting, setInviting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState("");

  const teamWithBadges = useMemo(
    () => team.map((m) => ({
      ...m,
      rb: roleBadge(m.role),
      sb: statusBadge(m.status),
    })),
    [team],
  );

  const handleInvite = async () => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) return;
    setInviting(true);
    try {
      await axios.post(`${API}/settings/team/invite`, inviteForm, { withCredentials: true });
      setShowInvite(false);
      setInviteForm({ name: "", email: "", role: "analyst" });
      onRefreshTeam();
    } catch (err) {
      logger.error("Invite failed:", err);
    } finally {
      setInviting(false);
    }
  };

  const handleRoleUpdate = async (memberId) => {
    try {
      await axios.put(`${API}/settings/team/${memberId}/role`, { role: editRole }, { withCredentials: true });
      setEditingId(null);
      onRefreshTeam();
    } catch (err) {
      logger.error("Role update failed:", err);
    }
  };

  const handleRemove = async (memberId) => {
    try {
      await axios.delete(`${API}/settings/team/${memberId}`, { withCredentials: true });
      onRefreshTeam();
    } catch (err) {
      logger.error("Remove failed:", err);
    }
  };

  const inputStyle = {
    width: "100%", background: "#080c12", border: "1px solid #1e2530",
    borderRadius: "8px", padding: "9px 14px", color: "#f1f5f9", fontSize: "13px",
  };

  return (
    <div style={{ background: "#0d1117", border: "1px solid #1e2530", borderRadius: "12px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e2530", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#f1f5f9" }}>Team Members</h3>
          <p style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>{team.length} members</p>
        </div>
        <button onClick={() => setShowInvite(true)} data-testid="invite-btn" style={{
          background: "linear-gradient(135deg, #2563eb, #1d4ed8)", border: "none",
          borderRadius: "8px", padding: "8px 16px", color: "#fff", fontSize: "12px", fontWeight: "600",
          cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
        }}>
          <UserPlus style={{ width: "14px", height: "14px" }} /> Invite Member
        </button>
      </div>

      {/* Invite Form */}
      {showInvite && (
        <div data-testid="invite-form" style={{ padding: "20px 24px", borderBottom: "1px solid #1e2530", background: "rgba(37,99,235,0.04)" }}>
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9" }}>Invite New Member</span>
            <button onClick={() => setShowInvite(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}>
              <X style={{ width: "16px", height: "16px" }} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input value={inviteForm.name} onChange={(e) => setInviteForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Full name" data-testid="invite-name" style={inputStyle} />
            <input value={inviteForm.email} onChange={(e) => setInviteForm(p => ({ ...p, email: e.target.value }))}
              placeholder="Email address" type="email" data-testid="invite-email" style={inputStyle} />
            <select value={inviteForm.role} onChange={(e) => setInviteForm(p => ({ ...p, role: e.target.value }))}
              data-testid="invite-role" style={inputStyle}>
              {ROLES.filter(r => r.value !== "super_admin").map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <button onClick={handleInvite} disabled={inviting} data-testid="send-invite-btn" style={{
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)", border: "none",
              borderRadius: "8px", padding: "9px", color: "#fff", fontSize: "12px", fontWeight: "600",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            }}>
              <Send style={{ width: "13px", height: "13px" }} />
              {inviting ? "Sending..." : "Send Invite"}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse" }} data-testid="team-table">
        <thead>
          <tr style={{ borderBottom: "1px solid #1a1f2e" }}>
            {["Name", "Email", "Role", "Status", "Actions"].map(h => (
              <th key={h} style={{
                padding: "12px 24px", textAlign: "left", fontSize: "10px", fontWeight: "600",
                textTransform: "uppercase", color: "#475569", letterSpacing: "1px",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teamWithBadges.map((m, idx) => {
            const { rb, sb } = m;
            const isEditing = editingId === m.id;
            return (
              <tr key={m.id || idx} data-testid={`team-row-${idx}`}
                style={{ borderBottom: idx < team.length - 1 ? "1px solid #0f1520" : "none" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#131923"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <td style={{ padding: "14px 24px", fontSize: "13px", fontWeight: "600", color: "#f1f5f9" }}>{m.name}</td>
                <td style={{ padding: "14px 24px", fontSize: "12px", color: "#94a3b8" }}>{m.email}</td>
                <td style={{ padding: "14px 24px" }}>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={{
                        background: "#080c12", border: "1px solid #2563eb", borderRadius: "6px",
                        padding: "4px 8px", color: "#f1f5f9", fontSize: "11px",
                      }}>
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                      <button onClick={() => handleRoleUpdate(m.id)} style={{
                        background: "#2563eb", border: "none", borderRadius: "4px", padding: "4px 8px",
                        color: "#fff", fontSize: "10px", fontWeight: "600", cursor: "pointer",
                      }}>Save</button>
                      <button onClick={() => setEditingId(null)} style={{
                        background: "transparent", border: "1px solid #1e2530", borderRadius: "4px",
                        padding: "4px 8px", color: "#94a3b8", fontSize: "10px", cursor: "pointer",
                      }}>Cancel</button>
                    </div>
                  ) : (
                    <span style={{ fontSize: "11px", fontWeight: "600", color: rb.color, background: rb.bg, padding: "3px 8px", borderRadius: "4px" }}>
                      {roleLabel(m.role)}
                    </span>
                  )}
                </td>
                <td style={{ padding: "14px 24px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "600", color: sb.color, background: sb.bg, padding: "3px 8px", borderRadius: "4px" }}>
                    {sb.label}
                  </span>
                </td>
                <td style={{ padding: "14px 24px" }}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditingId(m.id); setEditRole(m.role); }}
                      data-testid={`edit-member-${idx}`}
                      style={{ background: "transparent", border: "1px solid #1e2530", borderRadius: "6px", padding: "5px 8px", color: "#94a3b8", cursor: "pointer" }}
                    >
                      <Pencil style={{ width: "12px", height: "12px" }} />
                    </button>
                    <button
                      onClick={() => handleRemove(m.id)}
                      data-testid={`remove-member-${idx}`}
                      style={{ background: "transparent", border: "1px solid #1e2530", borderRadius: "6px", padding: "5px 8px", color: "#ef4444", cursor: "pointer" }}
                    >
                      <Trash2 style={{ width: "12px", height: "12px" }} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
