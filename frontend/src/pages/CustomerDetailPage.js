import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import logger from "../utils/logger";
import {
  ArrowLeft, User, Shield, AlertTriangle, CheckCircle, XCircle, Clock,
  FileText, Send, Calendar, MapPin, Briefcase, Phone, Mail, BadgeCheck, Flag
} from "lucide-react";
import { RiskScoreCircle, RiskLevelBadge } from "../components/screening/RiskScoreCircle";
import { KYCVerificationCard } from "../components/customers/KYCVerificationCard";
import { DigiLockerCard } from "../components/customers/DigiLockerCard";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const KYC_CFG = {
  verified: { icon: CheckCircle, color: "#10b981", label: "Verified" },
  pending: { icon: Clock, color: "#f59e0b", label: "Pending" },
  failed: { icon: XCircle, color: "#ef4444", label: "Failed" },
};

const TIMELINE_ICONS = {
  customer_created: { icon: User, color: "#2563eb" },
  kyc_submitted: { icon: FileText, color: "#f59e0b" },
  kyc_verified: { icon: CheckCircle, color: "#10b981" },
  kyc_failed: { icon: XCircle, color: "#ef4444" },
  sanctions_screened: { icon: Shield, color: "#2563eb" },
  pep_screened: { icon: Shield, color: "#8b5cf6" },
  pep_match: { icon: AlertTriangle, color: "#ef4444" },
  sanctions_match: { icon: AlertTriangle, color: "#ef4444" },
  case_opened: { icon: FileText, color: "#ef4444" },
  adverse_media_hit: { icon: AlertTriangle, color: "#f59e0b" },
};

const BREAKDOWN_LABELS = {
  kyc: "KYC Verification",
  sanctions: "Sanctions",
  pep: "PEP Status",
  adverse_media: "Adverse Media",
  country_risk: "Country Risk",
  occupation_risk: "Occupation Risk",
};

const BREAKDOWN_COLORS = {
  kyc: "#f59e0b",
  sanctions: "#ef4444",
  pep: "#8b5cf6",
  adverse_media: "#f97316",
  country_risk: "#06b6d4",
  occupation_risk: "#ec4899",
};

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [notes, setNotes] = useState([]);
  const [screenings, setScreenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [custRes, tlRes, notesRes, scrRes] = await Promise.all([
        axios.get(`${API}/customers/${id}`, { withCredentials: true }),
        axios.get(`${API}/customers/${id}/timeline`, { withCredentials: true }),
        axios.get(`${API}/customers/${id}/notes`, { withCredentials: true }),
        axios.get(`${API}/customers/${id}/screenings`, { withCredentials: true }),
      ]);
      setCustomer(custRes.data);
      setTimeline(tlRes.data.events || []);
      setNotes(notesRes.data.notes || []);
      setScreenings(scrRes.data.screenings || []);
    } catch (err) {
      logger.error("Failed to fetch customer data:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const { data } = await axios.post(`${API}/customers/${id}/notes`, { text: newNote.trim() }, { withCredentials: true });
      setNotes((prev) => [data, ...prev]);
      setNewNote("");
    } catch (err) {
      logger.error("Failed to add note:", err);
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div style={{ color: "#94a3b8" }}>Loading...</div></div>;
  }

  if (!customer) {
    return <div style={{ color: "#ef4444", textAlign: "center", padding: "60px" }}>Customer not found</div>;
  }

  const cd = customer.customer_data || {};
  const kycCfg = KYC_CFG[customer.kyc_status] || KYC_CFG.pending;
  const rl = (customer.risk_level || "low").toUpperCase();
  const breakdown = customer.risk_breakdown || {};

  return (
    <div data-testid="customer-detail-page">
      {/* Back button */}
      <button onClick={() => navigate("/customers")} data-testid="back-to-customers"
        className="flex items-center gap-2 mb-6" style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "13px" }}>
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </button>

      {/* ========== CUSTOMER HEADER ========== */}
      <div className="card-aml mb-6" data-testid="customer-header">
        <div className="flex items-start gap-6 flex-wrap">
          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: "50%", background: "rgba(37,99,235,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <User style={{ width: 32, height: 32, color: "#2563eb" }} />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="flex items-center gap-2 mb-1">
              <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#f1f5f9" }} data-testid="customer-name">
                {cd.full_name || cd.company_legal_name || "Unnamed"}
              </h1>
              {/* Verified Badge — shows when both Aadhaar + PAN are verified */}
              {customer.kyc_verifications?.aadhaar?.status === "verified" && customer.kyc_verifications?.pan?.status === "verified" && (
                <span data-testid="verified-badge" className="flex items-center gap-1" style={{
                  fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "99px",
                  background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)",
                  color: "#10b981", letterSpacing: "0.5px",
                }}>
                  <BadgeCheck style={{ width: 12, height: 12 }} /> VERIFIED
                </span>
              )}
              {/* Partial verification */}
              {(customer.kyc_verifications?.aadhaar?.status === "verified" || customer.kyc_verifications?.pan?.status === "verified")
                && !(customer.kyc_verifications?.aadhaar?.status === "verified" && customer.kyc_verifications?.pan?.status === "verified") && (
                <span data-testid="partial-verified-badge" className="flex items-center gap-1" style={{
                  fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "99px",
                  background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
                  color: "#f59e0b", letterSpacing: "0.5px",
                }}>
                  <BadgeCheck style={{ width: 12, height: 12 }} /> PARTIALLY VERIFIED
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <RiskLevelBadge level={rl} />
              <span className="flex items-center gap-1">
                <kycCfg.icon style={{ width: 13, height: 13, color: kycCfg.color }} />
                <span style={{ fontSize: "11px", fontWeight: 600, color: kycCfg.color }}>KYC {kycCfg.label}</span>
              </span>
              {customer.pep_status === "match" && (
                <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "5px", background: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}>
                  PEP MATCH
                </span>
              )}
              {customer.sanctions_status === "potential_match" && (
                <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "5px", background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                  SANCTIONS MATCH
                </span>
              )}
              {/* FATF Country Risk Badge */}
              {customer.country_risk?.level === "black_list" && (
                <span data-testid="fatf-black-list-badge" className="flex items-center gap-1" style={{
                  fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "5px",
                  background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
                  color: "#ef4444", letterSpacing: "0.3px",
                }}>
                  <Flag style={{ width: 11, height: 11 }} /> FATF BLACK LIST
                </span>
              )}
              {customer.country_risk?.level === "grey_list" && (
                <span data-testid="fatf-grey-list-badge" className="flex items-center gap-1" style={{
                  fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "5px",
                  background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)",
                  color: "#f59e0b", letterSpacing: "0.3px",
                }}>
                  <Flag style={{ width: 11, height: 11 }} /> FATF GREY LIST
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ fontSize: "12px", color: "#94a3b8" }}>
              {cd.nationality && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {cd.nationality}</span>}
              {cd.date_of_birth && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {cd.date_of_birth}</span>}
              {cd.occupation && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {cd.occupation}</span>}
              {cd.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {cd.phone}</span>}
              {cd.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {cd.email}</span>}
            </div>
            {/* FATF Country Risk Detail */}
            {customer.country_risk?.level && customer.country_risk.level !== "standard" && (
              <div data-testid="fatf-country-detail" style={{
                marginTop: "10px", padding: "10px 14px", borderRadius: "8px",
                background: customer.country_risk.level === "black_list" ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)",
                border: `1px solid ${customer.country_risk.level === "black_list" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)"}`,
              }}>
                <div className="flex items-center gap-2">
                  <AlertTriangle style={{
                    width: 13, height: 13,
                    color: customer.country_risk.level === "black_list" ? "#ef4444" : "#f59e0b",
                  }} />
                  <span style={{
                    fontSize: "12px", fontWeight: 700,
                    color: customer.country_risk.level === "black_list" ? "#ef4444" : "#f59e0b",
                  }}>
                    {customer.country_risk.label || "FATF Flagged"}
                  </span>
                  <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "auto" }}>
                    {customer.country_risk.country_name || cd.nationality} &mdash; +{customer.country_risk.risk_score_impact} risk pts
                  </span>
                </div>
                <p style={{ fontSize: "11px", color: "#475569", marginTop: "4px" }}>
                  {customer.country_risk.level === "black_list"
                    ? "This customer\u2019s jurisdiction is subject to FATF Call for Action. Enhanced Due Diligence (EDD) is mandatory."
                    : "This customer\u2019s jurisdiction is under FATF Increased Monitoring. Standard enhanced checks recommended."}
                </p>
              </div>
            )}
          </div>

          {/* Risk Score Circle */}
          <RiskScoreCircle score={customer.risk_score || 0} level={rl} size={120} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ===== LEFT COLUMN (2/3) ===== */}
        <div className="lg:col-span-2 space-y-6">

          {/* ========== TIMELINE ========== */}
          <div className="card-aml" data-testid="customer-timeline">
            <h2 style={sectionTitle}>Activity Timeline</h2>
            {timeline.length === 0 ? (
              <div style={{ color: "#475569", fontSize: "13px", padding: "20px 0" }}>No timeline events</div>
            ) : (
              <div style={{ position: "relative", paddingLeft: "32px" }}>
                {/* Vertical line */}
                <div style={{ position: "absolute", left: "11px", top: "4px", bottom: "4px", width: "2px", background: "#1e2530" }} />
                {timeline.map((ev, i) => {
                  const cfg = TIMELINE_ICONS[ev.event_type] || { icon: Clock, color: "#475569" };
                  const Icon = cfg.icon;
                  const isAlert = ev.event_type.includes("match") || ev.event_type.includes("failed") || ev.event_type.includes("case_opened");
                  return (
                    <div key={ev.id || i} className="flex items-start gap-3 mb-4 relative" data-testid={`timeline-event-${ev.event_type}`}>
                      <div style={{
                        position: "absolute", left: "-32px", width: "24px", height: "24px",
                        borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                        background: isAlert ? `${cfg.color}22` : "#0d1117",
                        border: `2px solid ${cfg.color}`,
                        zIndex: 1,
                      }}>
                        <Icon style={{ width: 12, height: 12, color: cfg.color }} />
                      </div>
                      <div style={{ flex: 1, paddingTop: "1px" }}>
                        <div style={{ fontSize: "13px", fontWeight: isAlert ? 700 : 500, color: isAlert ? cfg.color : "#f1f5f9" }}>
                          {ev.label}
                        </div>
                        <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                          {new Date(ev.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========== KYC VERIFICATION ========== */}
          <KYCVerificationCard customerId={id} customerName={cd.full_name || cd.company_legal_name} />

          {/* ========== DIGILOCKER VERIFICATION ========== */}
          <DigiLockerCard customerId={id} customerName={cd.full_name || cd.company_legal_name} />

          {/* ========== DOCUMENTS ========== */}
          <div className="card-aml" data-testid="customer-documents">
            <h2 style={sectionTitle}>Documents</h2>
            {(customer.documents || []).length === 0 ? (
              <div style={{ color: "#475569", fontSize: "13px", padding: "20px 0" }}>No documents uploaded</div>
            ) : (
              <div className="space-y-2">
                {customer.documents.map((doc, i) => {
                  const dCfg = KYC_CFG[doc.status] || KYC_CFG.pending;
                  const DIcon = dCfg.icon;
                  return (
                    <div key={i} className="flex items-center justify-between"
                      style={{ padding: "12px 16px", background: "#080c12", borderRadius: "8px", border: "1px solid #1e2530" }}>
                      <div className="flex items-center gap-3">
                        <FileText style={{ width: 16, height: 16, color: "#2563eb" }} />
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9" }}>{doc.doc_type}</div>
                          <div style={{ fontSize: "11px", color: "#475569" }}>{doc.doc_number}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DIcon style={{ width: 14, height: 14, color: dCfg.color }} />
                        <span style={{ fontSize: "11px", fontWeight: 600, color: dCfg.color }}>{dCfg.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========== SCREENING HISTORY ========== */}
          <div className="card-aml" data-testid="customer-screening-history">
            <h2 style={sectionTitle}>Screening History</h2>
            {screenings.length === 0 ? (
              <div style={{ color: "#475569", fontSize: "13px", padding: "20px 0" }}>No screenings found for this customer</div>
            ) : (
              <div className="space-y-2">
                {screenings.map((s) => (
                  <div key={s.id} className="flex items-center justify-between"
                    style={{ padding: "12px 16px", background: "#080c12", borderRadius: "8px", border: "1px solid #1e2530" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9" }}>
                        {(s.checks_run || []).map((c) => c.toUpperCase()).join(" + ")}
                      </div>
                      <div style={{ fontSize: "11px", color: "#475569" }}>
                        {new Date(s.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span style={{
                        fontSize: "14px", fontWeight: 700,
                        color: s.risk_score <= 25 ? "#10b981" : s.risk_score <= 50 ? "#f59e0b" : "#ef4444",
                      }}>{s.risk_score}</span>
                      <RiskLevelBadge level={s.risk_level} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== RIGHT COLUMN (1/3) ===== */}
        <div className="space-y-6">

          {/* ========== RISK BREAKDOWN ========== */}
          <div className="card-aml" data-testid="risk-breakdown">
            <h2 style={sectionTitle}>Risk Score Breakdown</h2>
            <div className="space-y-3">
              {Object.entries(breakdown).map(([key, value]) => {
                const maxVal = key === "sanctions" ? 35 : key === "kyc" ? 20 : key === "pep" ? 20 : 15;
                const pct = maxVal > 0 ? Math.min((value / maxVal) * 100, 100) : 0;
                return (
                  <div key={key} data-testid={`breakdown-${key}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>{BREAKDOWN_LABELS[key] || key}</span>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: value > 0 ? (BREAKDOWN_COLORS[key] || "#ef4444") : "#475569" }}>
                        +{value}
                      </span>
                    </div>
                    <div style={{ height: "6px", background: "#1e2530", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${pct}%`,
                        background: BREAKDOWN_COLORS[key] || "#ef4444",
                        borderRadius: "3px", transition: "width 0.6s ease",
                      }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ borderTop: "1px solid #1e2530", paddingTop: "10px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#f1f5f9" }}>Total</span>
                <span style={{ fontSize: "16px", fontWeight: 800, color: rl === "LOW" ? "#10b981" : rl === "MEDIUM" ? "#f59e0b" : "#ef4444" }}>
                  {customer.risk_score || 0}
                </span>
              </div>
            </div>
          </div>

          {/* ========== NOTES ========== */}
          <div className="card-aml" data-testid="customer-notes">
            <h2 style={sectionTitle}>Internal Notes</h2>

            {/* Add Note */}
            <div className="flex gap-2 mb-4">
              <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a compliance note..."
                className="input-aml flex-1" data-testid="note-input"
                onKeyDown={(e) => e.key === "Enter" && addNote()}
                style={{ fontSize: "13px" }} />
              <button onClick={addNote} disabled={addingNote || !newNote.trim()}
                className="btn-primary" data-testid="add-note-btn"
                style={{ display: "flex", alignItems: "center", gap: "4px", opacity: addingNote || !newNote.trim() ? 0.5 : 1 }}>
                <Send className="w-3 h-3" />
              </button>
            </div>

            {notes.length === 0 ? (
              <div style={{ color: "#475569", fontSize: "13px", padding: "12px 0" }}>No notes yet</div>
            ) : (
              <div className="space-y-3">
                {notes.map((n) => (
                  <div key={n.id} style={{ padding: "12px", background: "#080c12", borderRadius: "8px", border: "1px solid #1e2530" }}
                    data-testid={`note-${n.id}`}>
                    <div style={{ fontSize: "13px", color: "#f1f5f9", marginBottom: "6px", lineHeight: "1.5" }}>{n.text}</div>
                    <div style={{ fontSize: "11px", color: "#475569" }}>
                      {n.created_by_name || "Unknown"} — {new Date(n.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const sectionTitle = { fontSize: "13px", fontWeight: 700, color: "#f1f5f9", marginBottom: "16px" };
