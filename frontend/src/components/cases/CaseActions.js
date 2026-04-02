import React from "react";
import { CheckCircle, Flag, ChevronUp } from "lucide-react";

export const CaseActions = ({
  caseData, updating,
  onUpdateStatus, onUpdatePriority,
  showEscalate, setShowEscalate, escalateReason, setEscalateReason, onEscalate,
  showSAR, setShowSAR, sarReference, setSarReference, onFileSAR,
  showClose, setShowClose, disposition, setDisposition, dispositionNote, setDispositionNote, onClose,
}) => {
  const selectStyle = {
    width: "100%", background: "#080c12", border: "1px solid #1e2530",
    borderRadius: "8px", padding: "8px 12px", color: "#f1f5f9", fontSize: "13px"
  };
  const labelStyle = {
    fontSize: "11px", color: "#475569", marginBottom: "8px",
    textTransform: "uppercase", letterSpacing: "1px"
  };

  return (
    <div style={{
      background: "#0d1117", border: "1px solid #1e2530",
      borderRadius: "12px", padding: "24px", marginBottom: "24px"
    }}>
      <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9", marginBottom: "16px" }}>Actions</h2>
      <div className="space-y-2">
        {/* Status */}
        <div style={{ marginBottom: "16px" }}>
          <div style={labelStyle}>Update Status</div>
          <select value={caseData.status} onChange={(e) => onUpdateStatus(e.target.value)} disabled={updating} data-testid="status-select" style={selectStyle}>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="pending_info">Pending Info</option>
            <option value="escalated">Escalated</option>
          </select>
        </div>

        {/* Priority */}
        <div style={{ marginBottom: "16px" }}>
          <div style={labelStyle}>Update Priority</div>
          <select value={caseData.priority} onChange={(e) => onUpdatePriority(e.target.value)} disabled={updating} data-testid="priority-select" style={selectStyle}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Escalate */}
        <button onClick={() => setShowEscalate(!showEscalate)} data-testid="escalate-btn" style={{
          width: "100%", background: "rgba(249, 115, 22, 0.1)", border: "1px solid rgba(249, 115, 22, 0.3)",
          borderRadius: "8px", padding: "10px", color: "#f97316", fontSize: "13px", fontWeight: "600",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
        }}>
          <ChevronUp className="w-4 h-4" /> Escalate Case
        </button>
        {showEscalate && (
          <div style={{ background: "#080c12", border: "1px solid #1e2530", borderRadius: "8px", padding: "12px", marginTop: "8px" }}>
            <textarea value={escalateReason} onChange={(e) => setEscalateReason(e.target.value)} placeholder="Reason for escalation..." data-testid="escalate-reason-input"
              style={{ width: "100%", background: "#0d1117", border: "1px solid #1e2530", borderRadius: "6px", padding: "10px", color: "#f1f5f9", fontSize: "13px", minHeight: "60px", resize: "vertical", fontFamily: "inherit" }} />
            <button onClick={onEscalate} disabled={!escalateReason.trim() || updating} data-testid="confirm-escalate-btn"
              style={{ width: "100%", marginTop: "8px", background: escalateReason.trim() ? "#f97316" : "#1e2530", borderRadius: "6px", padding: "8px", color: "#ffffff", fontSize: "12px", fontWeight: "600", border: "none", cursor: escalateReason.trim() ? "pointer" : "not-allowed" }}>
              Confirm Escalation
            </button>
          </div>
        )}

        {/* File SAR */}
        {!caseData.sar_filed && (
          <>
            <button onClick={() => setShowSAR(!showSAR)} data-testid="file-sar-btn" style={{
              width: "100%", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "8px", padding: "10px", color: "#ef4444", fontSize: "13px", fontWeight: "600",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
            }}>
              <Flag className="w-4 h-4" /> File SAR
            </button>
            {showSAR && (
              <div style={{ background: "#080c12", border: "1px solid #1e2530", borderRadius: "8px", padding: "12px", marginTop: "8px" }}>
                <input value={sarReference} onChange={(e) => setSarReference(e.target.value)} placeholder="SAR Reference Number..." data-testid="sar-reference-input"
                  style={{ width: "100%", background: "#0d1117", border: "1px solid #1e2530", borderRadius: "6px", padding: "10px", color: "#f1f5f9", fontSize: "13px" }} />
                <button onClick={onFileSAR} disabled={!sarReference.trim() || updating} data-testid="confirm-sar-btn"
                  style={{ width: "100%", marginTop: "8px", background: sarReference.trim() ? "#ef4444" : "#1e2530", borderRadius: "6px", padding: "8px", color: "#ffffff", fontSize: "12px", fontWeight: "600", border: "none", cursor: sarReference.trim() ? "pointer" : "not-allowed" }}>
                  Confirm SAR Filing
                </button>
              </div>
            )}
          </>
        )}

        {/* Close Case */}
        <button onClick={() => setShowClose(!showClose)} data-testid="close-case-btn" style={{
          width: "100%", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)",
          borderRadius: "8px", padding: "10px", color: "#10b981", fontSize: "13px", fontWeight: "600",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
        }}>
          <CheckCircle className="w-4 h-4" /> Close Case
        </button>
        {showClose && (
          <div style={{ background: "#080c12", border: "1px solid #1e2530", borderRadius: "8px", padding: "12px", marginTop: "8px" }}>
            <select value={disposition} onChange={(e) => setDisposition(e.target.value)} data-testid="disposition-select"
              style={{ ...selectStyle, marginBottom: "8px", background: "#0d1117" }}>
              <option value="">Select Disposition...</option>
              <option value="no_further_action">No Further Action</option>
              <option value="sar_filed">SAR Filed</option>
              <option value="customer_exited">Customer Exited</option>
              <option value="monitoring_increased">Monitoring Increased</option>
              <option value="referred_to_law_enforcement">Referred to Law Enforcement</option>
            </select>
            <textarea value={dispositionNote} onChange={(e) => setDispositionNote(e.target.value)} placeholder="Closure notes (required)..." data-testid="disposition-note-input"
              style={{ width: "100%", background: "#0d1117", border: "1px solid #1e2530", borderRadius: "6px", padding: "10px", color: "#f1f5f9", fontSize: "13px", minHeight: "60px", resize: "vertical", fontFamily: "inherit" }} />
            <button onClick={onClose} disabled={!disposition || !dispositionNote.trim() || updating} data-testid="confirm-close-btn"
              style={{ width: "100%", marginTop: "8px", background: disposition && dispositionNote.trim() ? "#10b981" : "#1e2530", borderRadius: "6px", padding: "8px", color: "#ffffff", fontSize: "12px", fontWeight: "600", border: "none", cursor: disposition && dispositionNote.trim() ? "pointer" : "not-allowed" }}>
              Confirm Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
