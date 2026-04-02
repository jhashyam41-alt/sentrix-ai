import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft } from "lucide-react";
import { CaseNotes } from "../components/cases/CaseNotes";
import { CaseActions } from "../components/cases/CaseActions";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const priorityColors = {
  critical: { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444", border: "rgba(239, 68, 68, 0.3)" },
  high: { bg: "rgba(249, 115, 22, 0.15)", text: "#f97316", border: "rgba(249, 115, 22, 0.3)" },
  medium: { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.3)" },
  low: { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981", border: "rgba(16, 185, 129, 0.3)" }
};

const statusColors = {
  open: { bg: "rgba(37, 99, 235, 0.15)", text: "#2563eb" },
  in_progress: { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b" },
  escalated: { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444" },
  pending_info: { bg: "rgba(168, 85, 247, 0.15)", text: "#a855f7" },
  closed: { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981" }
};

const dispositionLabels = {
  no_further_action: "No Further Action",
  sar_filed: "SAR Filed",
  customer_exited: "Customer Exited",
  monitoring_increased: "Monitoring Increased",
  referred_to_law_enforcement: "Referred to Law Enforcement"
};

export default function CaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const [escalateReason, setEscalateReason] = useState("");
  const [showSAR, setShowSAR] = useState(false);
  const [sarReference, setSarReference] = useState("");
  const [showClose, setShowClose] = useState(false);
  const [disposition, setDisposition] = useState("");
  const [dispositionNote, setDispositionNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchCase = useCallback(async () => {
    try {
      const [caseRes, notesRes] = await Promise.all([
        axios.get(`${API}/cases/${id}`, { withCredentials: true }),
        axios.get(`${API}/cases/${id}/notes`, { withCredentials: true })
      ]);
      setCaseData(caseRes.data);
      setNotes(notesRes.data.notes || []);
    } catch (error) {
      console.error("Failed to fetch case:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  const addNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await axios.post(`${API}/cases/${id}/notes`, { note: newNote }, { withCredentials: true });
      setNewNote("");
      await fetchCase();
    } catch (error) {
      console.error("Failed to add note:", error);
    } finally {
      setAddingNote(false);
    }
  };

  const updateStatus = async (status) => {
    setUpdating(true);
    try {
      await axios.put(`${API}/cases/${id}`, { status }, { withCredentials: true });
      await fetchCase();
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdating(false);
    }
  };

  const updatePriority = async (priority) => {
    setUpdating(true);
    try {
      await axios.put(`${API}/cases/${id}`, { priority }, { withCredentials: true });
      await fetchCase();
    } catch (error) {
      console.error("Failed to update priority:", error);
    } finally {
      setUpdating(false);
    }
  };

  const escalateCase = async () => {
    if (!escalateReason.trim()) return;
    setUpdating(true);
    try {
      await axios.post(`${API}/cases/${id}/escalate`, { reason: escalateReason, escalated_to: null }, { withCredentials: true });
      setShowEscalate(false);
      setEscalateReason("");
      await fetchCase();
    } catch (error) {
      console.error("Failed to escalate:", error);
    } finally {
      setUpdating(false);
    }
  };

  const fileSAR = async () => {
    if (!sarReference.trim()) return;
    setUpdating(true);
    try {
      await axios.post(`${API}/cases/${id}/sar`, { sar_reference: sarReference }, { withCredentials: true });
      setShowSAR(false);
      setSarReference("");
      await fetchCase();
    } catch (error) {
      console.error("Failed to file SAR:", error);
    } finally {
      setUpdating(false);
    }
  };

  const closeCase = async () => {
    if (!disposition || !dispositionNote.trim()) return;
    setUpdating(true);
    try {
      await axios.post(`${API}/cases/${id}/close`, { disposition, disposition_note: dispositionNote }, { withCredentials: true });
      setShowClose(false);
      setDisposition("");
      setDispositionNote("");
      await fetchCase();
    } catch (error) {
      console.error("Failed to close case:", error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>Loading case...</div>;
  }

  if (!caseData) {
    return <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>Case not found</div>;
  }

  const pColor = priorityColors[caseData.priority] || priorityColors.medium;
  const sColor = statusColors[caseData.status] || statusColors.open;
  const isClosed = caseData.status === "closed";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/cases")}
          data-testid="back-to-cases-btn"
          style={{
            background: "transparent",
            border: "1px solid #1e2530",
            borderRadius: "8px",
            padding: "8px",
            cursor: "pointer",
            color: "#94a3b8"
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 style={{ fontSize: "26px", fontWeight: "700", letterSpacing: "-0.5px", color: "#f1f5f9" }} data-testid="case-title">
              {caseData.case_id}
            </h1>
            <span style={{
              background: sColor.bg,
              color: sColor.text,
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }} data-testid="case-status-badge">
              {caseData.status?.replace("_", " ")}
            </span>
            <span style={{
              background: pColor.bg,
              color: pColor.text,
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }} data-testid="case-priority-badge">
              {caseData.priority}
            </span>
            {caseData.sar_filed && (
              <span style={{
                background: "rgba(239, 68, 68, 0.2)",
                color: "#ef4444",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: "700",
                textTransform: "uppercase"
              }} data-testid="sar-filed-badge">
                SAR FILED
              </span>
            )}
          </div>
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>
            {caseData.case_type?.replace("_", " ")} — {caseData.customer_name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Case Details Card */}
          <div style={{
            background: "#0d1117",
            border: "1px solid #1e2530",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "24px"
          }}>
            <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9", marginBottom: "16px" }}>
              Case Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Customer</div>
                <button
                  onClick={() => navigate(`/customers/${caseData.customer_id}`)}
                  style={{ color: "#2563eb", fontSize: "14px", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
                  data-testid="view-customer-link"
                >
                  {caseData.customer_name}
                </button>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Type</div>
                <div style={{ color: "#f1f5f9", fontSize: "14px", textTransform: "capitalize" }}>{caseData.case_type?.replace("_", " ")}</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Created</div>
                <div style={{ color: "#94a3b8", fontSize: "13px" }}>{new Date(caseData.created_at).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Last Updated</div>
                <div style={{ color: "#94a3b8", fontSize: "13px" }}>{new Date(caseData.updated_at).toLocaleString()}</div>
              </div>
              {caseData.sar_filed && (
                <>
                  <div>
                    <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>SAR Reference</div>
                    <div style={{ color: "#ef4444", fontSize: "14px", fontWeight: "600" }}>{caseData.sar_reference}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>SAR Filed Date</div>
                    <div style={{ color: "#94a3b8", fontSize: "13px" }}>{new Date(caseData.sar_filed_date).toLocaleString()}</div>
                  </div>
                </>
              )}
              {caseData.disposition && (
                <>
                  <div>
                    <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Disposition</div>
                    <div style={{ color: "#10b981", fontSize: "14px", fontWeight: "600" }}>
                      {dispositionLabels[caseData.disposition] || caseData.disposition}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Disposition Note</div>
                    <div style={{ color: "#94a3b8", fontSize: "13px" }}>{caseData.disposition_note}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          <CaseNotes
            notes={notes}
            isClosed={isClosed}
            newNote={newNote}
            setNewNote={setNewNote}
            addingNote={addingNote}
            onAddNote={addNote}
          />
        </div>

        {/* Sidebar Actions */}
        <div>
          {!isClosed && (
            <CaseActions
              caseData={caseData}
              updating={updating}
              onUpdateStatus={updateStatus}
              onUpdatePriority={updatePriority}
              showEscalate={showEscalate}
              setShowEscalate={setShowEscalate}
              escalateReason={escalateReason}
              setEscalateReason={setEscalateReason}
              onEscalate={escalateCase}
              showSAR={showSAR}
              setShowSAR={setShowSAR}
              sarReference={sarReference}
              setSarReference={setSarReference}
              onFileSAR={fileSAR}
              showClose={showClose}
              setShowClose={setShowClose}
              disposition={disposition}
              setDisposition={setDisposition}
              dispositionNote={dispositionNote}
              setDispositionNote={setDispositionNote}
              onClose={closeCase}
            />
          )}

          {/* Case Info Summary */}
          <div style={{
            background: "#0d1117",
            border: "1px solid #1e2530",
            borderRadius: "12px",
            padding: "24px"
          }}>
            <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9", marginBottom: "16px" }}>
              Case Summary
            </h2>
            <div className="space-y-4">
              <div>
                <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px" }}>Status</div>
                <span style={{
                  background: sColor.bg,
                  color: sColor.text,
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  textTransform: "capitalize"
                }}>
                  {caseData.status?.replace("_", " ")}
                </span>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px" }}>Priority</div>
                <span style={{
                  background: pColor.bg,
                  color: pColor.text,
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  textTransform: "capitalize"
                }}>
                  {caseData.priority}
                </span>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px" }}>SAR Status</div>
                <span style={{
                  color: caseData.sar_filed ? "#ef4444" : "#94a3b8",
                  fontSize: "13px",
                  fontWeight: caseData.sar_filed ? "700" : "400"
                }}>
                  {caseData.sar_filed ? `Filed: ${caseData.sar_reference}` : "Not Filed"}
                </span>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px" }}>Notes</div>
                <span style={{ color: "#f1f5f9", fontSize: "13px" }}>{notes.length} total</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
