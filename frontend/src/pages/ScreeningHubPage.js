import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logger from "../utils/logger";
import { Plus, Search, Filter, X } from "lucide-react";
import { NewScreeningForm } from "../components/screening/NewScreeningForm";
import { ScreeningProgress } from "../components/screening/ScreeningProgress";
import { ScreeningResultCard } from "../components/screening/ScreeningFinalResult";
import { ScreeningHistoryTable } from "../components/screening/ScreeningHistoryTable";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INITIAL_FORM = {
  fullName: "",
  dateOfBirth: "",
  nationality: "IN",
  idType: "",
  idNumber: "",
  checks: ["sanctions", "pep"],
};

export default function ScreeningHubPage() {
  const navigate = useNavigate();

  // Screening history state
  const [screenings, setScreenings] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // New screening state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [latestResult, setLatestResult] = useState(null);

  // View detail state
  const [viewDetail, setViewDetail] = useState(null);

  const fetchScreenings = useCallback(async (p = 1) => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 15 });
      if (filterLevel) params.set("risk_level", filterLevel);
      if (filterSearch) params.set("search", filterSearch);
      const { data } = await axios.get(`${API}/screenings?${params}`, { withCredentials: true });
      setScreenings(data.screenings || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setPages(data.pages || 1);
    } catch (err) {
      logger.error("Failed to fetch screenings:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [filterLevel, filterSearch]);

  useEffect(() => { fetchScreenings(1); }, [fetchScreenings]);

  const handleSubmit = async () => {
    if (!form.fullName.trim() || form.checks.length === 0) return;

    setSubmitting(true);
    setIsRunning(true);
    setIsComplete(false);
    setLatestResult(null);
    setShowForm(false);

    try {
      const payload = {
        fullName: form.fullName.trim(),
        dateOfBirth: form.dateOfBirth || undefined,
        nationality: form.nationality || undefined,
        idType: form.idType || undefined,
        idNumber: form.idNumber || undefined,
        checks: form.checks,
      };

      // Artificial delay so the progress animation plays out
      const [result] = await Promise.all([
        axios.post(`${API}/screenings/run`, payload, { withCredentials: true }).then((r) => r.data),
        new Promise((resolve) => setTimeout(resolve, (form.checks.length + 1) * 600 + 400)),
      ]);

      setLatestResult(result);
      setIsComplete(true);
      setForm(INITIAL_FORM);
      await fetchScreenings(1);
    } catch (err) {
      logger.error("Screening failed:", err);
      setIsComplete(true);
    } finally {
      setSubmitting(false);
      setIsRunning(false);
    }
  };

  const handleRescreen = (s) => {
    setForm({
      fullName: s.full_name,
      dateOfBirth: s.date_of_birth || "",
      nationality: s.nationality || "IN",
      idType: s.id_type || "",
      idNumber: s.id_number || "",
      checks: s.checks_run || ["sanctions", "pep"],
    });
    setLatestResult(null);
    setIsComplete(false);
    setShowForm(true);
  };

  const handleView = (s) => {
    setViewDetail(s);
    setLatestResult(s);
    setIsComplete(true);
    setIsRunning(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCreateCase = async () => {
    if (!latestResult) return;
    try {
      const payload = {
        customer_id: null,
        customer_name: latestResult.full_name,
        case_type: latestResult.sanctions_result?.status === "match" ? "sanctions_match"
          : latestResult.pep_result?.status === "match" ? "pep_match"
          : "manual_review",
        priority: latestResult.risk_level === "CRITICAL" ? "critical"
          : latestResult.risk_level === "HIGH" ? "high" : "medium",
        description: `Auto-created from screening. Risk Score: ${latestResult.risk_score}/100 (${latestResult.risk_level}). Checks: ${(latestResult.checks_run || []).join(", ")}.`,
      };
      const { data } = await axios.post(`${API}/cases`, payload, { withCredentials: true });
      navigate(`/cases/${data.id || data.case_id}`);
    } catch (err) {
      logger.error("Failed to create case:", err);
    }
  };

  return (
    <div data-testid="screening-hub-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "-0.5px", color: "#f1f5f9", marginBottom: "4px" }}
              data-testid="screening-hub-title">
            Screening
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>
            Run sanctions, PEP, adverse media &amp; KYC screenings
          </p>
        </div>
        <button onClick={() => { setShowForm(true); setLatestResult(null); setIsComplete(false); }}
          className="btn-primary" data-testid="new-screening-btn"
          style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Plus className="w-4 h-4" /> New Screening
        </button>
      </div>

      {/* Progress + Result area */}
      <ScreeningProgress checks={form.checks} isRunning={isRunning} isComplete={isComplete} />

      {latestResult && isComplete && (
        <ScreeningResultCard result={latestResult} onCreateCase={handleCreateCase} />
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2" style={{
          background: "#0d1117", border: "1px solid #1e2530", borderRadius: "8px",
          padding: "6px 12px", flex: "1", maxWidth: "320px",
        }}>
          <Search style={{ width: 14, height: 14, color: "#475569" }} />
          <input
            type="text"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            placeholder="Search by name..."
            data-testid="screening-search"
            style={{
              background: "transparent", border: "none", outline: "none",
              color: "#f1f5f9", fontSize: "13px", width: "100%",
            }}
          />
          {filterSearch && (
            <button onClick={() => setFilterSearch("")}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "#475569", padding: 0 }}>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter style={{ width: 14, height: 14, color: "#475569" }} />
          {["", "LOW", "MEDIUM", "HIGH", "CRITICAL"].map((level) => (
            <button key={level} onClick={() => setFilterLevel(level)}
              data-testid={`filter-${level || "all"}`}
              style={{
                padding: "5px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 600,
                cursor: "pointer",
                border: filterLevel === level ? "1px solid #2563eb" : "1px solid #1e2530",
                background: filterLevel === level ? "rgba(37,99,235,0.12)" : "transparent",
                color: filterLevel === level ? "#60a5fa" : "#94a3b8",
                transition: "all 0.15s",
              }}>
              {level || "All"}
            </button>
          ))}
        </div>
      </div>

      {/* History Table */}
      <ScreeningHistoryTable
        screenings={screenings}
        total={total}
        page={page}
        pages={pages}
        onPageChange={(p) => fetchScreenings(p)}
        onView={handleView}
        onRescreen={handleRescreen}
        loading={historyLoading}
      />

      {/* New Screening Modal */}
      {showForm && (
        <NewScreeningForm
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
          submitting={submitting}
        />
      )}
    </div>
  );
}
