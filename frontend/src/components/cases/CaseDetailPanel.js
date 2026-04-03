import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import logger from "../../utils/logger";
import { X, Send, Flag } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const priorityColors = {
  critical: { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444" },
  high: { bg: "rgba(249, 115, 22, 0.15)", text: "#f97316" },
  medium: { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b" },
  low: { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981" },
};

const statusLabels = {
  open: "New Alert",
  in_progress: "Under Investigation",
  escalated: "Escalated",
  closed: "Resolved",
};

export function CaseDetailPanel({ caseData, teamMembers, onClose, onUpdate }) {
  const [notes, setNotes] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [sarReport, setSarReport] = useState(null);
  const [generatingSar, setGeneratingSar] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/cases/${caseData.id}/notes`, { withCredentials: true });
      setNotes(data.notes || []);
    } catch (err) {
      logger.error("Failed to fetch notes", err);
    }
  }, [caseData.id]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const addComment = async () => {
    if (!newComment.trim()) return;
    setAddingComment(true);
    try {
      await axios.post(`${API}/cases/${caseData.id}/notes`, { note: newComment }, { withCredentials: true });
      setNewComment("");
      await fetchNotes();
    } catch (err) {
      logger.error("Failed to add comment", err);
    } finally {
      setAddingComment(false);
    }
  };

  const handleAssign = async (name) => {
    setAssigning(true);
    try {
      await axios.put(`${API}/cases/${caseData.id}/assign`, { assigned_to: name || null }, { withCredentials: true });
      onUpdate();
    } catch (err) {
      logger.error("Failed to assign", err);
    } finally {
      setAssigning(false);
    }
  };

  const generateSar = async () => {
    setGeneratingSar(true);
    try {
      const { data } = await axios.post(`${API}/cases/${caseData.id}/generate-sar`, {}, { withCredentials: true });
      setSarReport(data);
    } catch (err) {
      logger.error("Failed to generate SAR", err);
    } finally {
      setGeneratingSar(false);
    }
  };

  const pColor = priorityColors[caseData.priority] || priorityColors.medium;
  const isClosed = caseData.status === "closed";

  return (
    <div
      data-testid="case-detail-panel-overlay"
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 900,
        display: "flex", justifyContent: "flex-end", backdropFilter: "blur(2px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid="case-detail-panel"
        style={{
          width: "560px", maxWidth: "90vw", background: "#080c12",
          borderLeft: "1px solid #1e2530", height: "100vh",
          overflowY: "auto", animation: "casePanelSlideIn 0.25s ease",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid #1e2530",
          position: "sticky", top: 0, background: "#080c12", zIndex: 10,
        }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span style={{ fontSize: "18px", fontWeight: "700", color: "#f1f5f9" }}>{caseData.case_id}</span>
              <span style={{
                fontSize: "10px", fontWeight: "700", textTransform: "uppercase",
                color: pColor.text, background: pColor.bg,
                padding: "3px 8px", borderRadius: "4px",
              }}>{caseData.priority}</span>
            </div>
            <button onClick={onClose} data-testid="close-detail-panel" style={{
              background: "transparent", border: "1px solid #1e2530", borderRadius: "6px",
              padding: "6px", cursor: "pointer", color: "#94a3b8",
            }}>
              <X style={{ width: "16px", height: "16px" }} />
            </button>
          </div>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "#f1f5f9", marginBottom: "4px" }}>
            {caseData.customer_name}
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>
            {statusLabels[caseData.status] || caseData.status} &middot; {caseData.case_type?.replace(/_/g, " ")}
          </div>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {/* Description */}
          {caseData.description && (
            <div style={{
              background: "#0d1117", border: "1px solid #1e2530", borderRadius: "10px",
              padding: "14px", marginBottom: "16px",
            }}>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Description</div>
              <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: "1.6" }}>{caseData.description}</p>
            </div>
          )}

          {/* Risk & Info Grid */}
          <div style={{
            background: "#0d1117", border: "1px solid #1e2530", borderRadius: "10px",
            padding: "14px", marginBottom: "16px",
          }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Case Information</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div style={{ fontSize: "10px", color: "#475569", marginBottom: "2px" }}>Risk Score</div>
                <div style={{
                  fontSize: "14px", fontWeight: "700",
                  color: caseData.customer_risk_score > 50 ? "#ef4444" : caseData.customer_risk_score > 25 ? "#f59e0b" : "#10b981"
                }}>
                  {caseData.customer_risk_score ?? "N/A"}/100
                </div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "#475569", marginBottom: "2px" }}>Risk Level</div>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9", textTransform: "capitalize" }}>
                  {caseData.customer_risk_level || "N/A"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "#475569", marginBottom: "2px" }}>Created</div>
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>{new Date(caseData.created_at).toLocaleDateString()}</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "#475569", marginBottom: "2px" }}>Due Date</div>
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>{caseData.due_date ? new Date(caseData.due_date).toLocaleDateString() : "N/A"}</div>
              </div>
            </div>
          </div>

          {/* Assignment */}
          {!isClosed && (
            <div style={{
              background: "#0d1117", border: "1px solid #1e2530", borderRadius: "10px",
              padding: "14px", marginBottom: "16px",
            }}>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Assign To</div>
              <select
                value={caseData.assigned_to || ""}
                onChange={(e) => handleAssign(e.target.value)}
                disabled={assigning}
                data-testid="assign-dropdown"
                style={{
                  width: "100%", background: "#080c12", border: "1px solid #1e2530",
                  borderRadius: "8px", padding: "8px 12px", color: "#f1f5f9", fontSize: "13px",
                }}
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.name}>{m.name} — {m.role}</option>
                ))}
              </select>
            </div>
          )}

          {/* SAR Generation */}
          {!isClosed && !caseData.sar_filed && (
            <button
              onClick={generateSar}
              disabled={generatingSar}
              data-testid="generate-sar-btn"
              style={{
                width: "100%", background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "10px",
                padding: "12px", color: "#ef4444", fontSize: "13px", fontWeight: "600",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                gap: "8px", marginBottom: "16px",
              }}
            >
              <Flag style={{ width: "14px", height: "14px" }} />
              {generatingSar ? "Generating SAR Report..." : "Generate SAR Report"}
            </button>
          )}

          {/* SAR Report Display */}
          {sarReport && (
            <div data-testid="sar-report-display" style={{
              background: "#0d1117", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "10px",
              padding: "16px", marginBottom: "16px",
            }}>
              <div className="flex items-center justify-between mb-3">
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#ef4444" }}>
                  SAR Report — {sarReport.sar_reference}
                </div>
                <span style={{ fontSize: "10px", color: "#f59e0b", background: "rgba(245,158,11,0.15)", padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>
                  {sarReport.status}
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: "1.8" }}>
                <div><strong style={{ color: "#f1f5f9" }}>Subject:</strong> {sarReport.subject?.full_name}</div>
                <div><strong style={{ color: "#f1f5f9" }}>DOB:</strong> {sarReport.subject?.date_of_birth} | <strong style={{ color: "#f1f5f9" }}>Nationality:</strong> {sarReport.subject?.nationality}</div>
                <div><strong style={{ color: "#f1f5f9" }}>Occupation:</strong> {sarReport.subject?.occupation}</div>
                <div style={{ marginTop: "8px" }}>
                  <strong style={{ color: "#f1f5f9" }}>Risk:</strong> {sarReport.risk_assessment?.risk_score}/100 ({String(sarReport.risk_assessment?.risk_level || "").toUpperCase()})
                </div>
                <div><strong style={{ color: "#f1f5f9" }}>PEP:</strong> {sarReport.risk_assessment?.pep_status} | <strong style={{ color: "#f1f5f9" }}>Sanctions:</strong> {sarReport.risk_assessment?.sanctions_status}</div>
                <div style={{ marginTop: "8px", borderTop: "1px solid #1e2530", paddingTop: "8px" }}>
                  <strong style={{ color: "#f1f5f9" }}>Narrative:</strong><br />{sarReport.narrative}
                </div>
              </div>
            </div>
          )}

          {/* Activity Log */}
          <div style={{
            background: "#0d1117", border: "1px solid #1e2530", borderRadius: "10px",
            padding: "14px",
          }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
              Activity Log ({notes.length})
            </div>

            {!isClosed && (
              <div style={{ marginBottom: "12px" }}>
                <div className="flex gap-2">
                  <input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    data-testid="panel-comment-input"
                    onKeyDown={(e) => e.key === "Enter" && addComment()}
                    style={{
                      flex: 1, background: "#080c12", border: "1px solid #1e2530",
                      borderRadius: "8px", padding: "8px 12px", color: "#f1f5f9", fontSize: "13px",
                    }}
                  />
                  <button
                    onClick={addComment}
                    disabled={!newComment.trim() || addingComment}
                    data-testid="panel-add-comment-btn"
                    style={{
                      background: newComment.trim() ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "#1e2530",
                      border: "none", borderRadius: "8px", padding: "8px 12px",
                      color: newComment.trim() ? "#fff" : "#475569",
                      cursor: newComment.trim() ? "pointer" : "not-allowed",
                    }}
                  >
                    <Send style={{ width: "14px", height: "14px" }} />
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {notes.map((note) => (
                <div
                  key={note.id}
                  data-testid={`panel-note-${note.id}`}
                  style={{
                    background: note.is_system ? "rgba(37, 99, 235, 0.06)" : "#080c12",
                    border: `1px solid ${note.is_system ? "rgba(37, 99, 235, 0.15)" : "#1e2530"}`,
                    borderRadius: "8px", padding: "10px",
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontSize: "11px", fontWeight: "600", color: note.is_system ? "#2563eb" : "#f1f5f9" }}>
                      {note.is_system ? "System" : note.author_name}
                    </span>
                    <span style={{ fontSize: "10px", color: "#475569" }}>
                      {new Date(note.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: "1.5" }}>{note.note}</p>
                </div>
              ))}
              {notes.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px", color: "#475569", fontSize: "12px" }}>
                  No activity yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
