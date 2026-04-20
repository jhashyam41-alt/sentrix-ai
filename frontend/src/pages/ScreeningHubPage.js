import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logger from "../utils/logger";
import { Plus, Search, Filter, X, Settings, Shield, FileSpreadsheet } from "lucide-react";
import { getSecureItem, setSecureItem, removeSecureItem } from "../utils/secureStorage";
import { NewScreeningForm } from "../components/screening/NewScreeningForm";
import { ScreeningProgress } from "../components/screening/ScreeningProgress";
import { ScreeningResultCard } from "../components/screening/ScreeningFinalResult";
import { ScreeningHistoryTable } from "../components/screening/ScreeningHistoryTable";
import { BulkScreeningPanel } from "../components/screening/BulkScreeningPanel";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LS_KEY = "rudrik_sanctions_api_key";

const INITIAL_FORM = {
  fullName: "",
  dateOfBirth: "",
  nationality: "IN",
  idType: "",
  idNumber: "",
  checks: ["sanctions", "pep", "adverse_media"],
};

export default function ScreeningHubPage() {
  const navigate = useNavigate();

  // Screening history
  const [screenings, setScreenings] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // New screening
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [latestResult, setLatestResult] = useState(null);
  const [viewDetail, setViewDetail] = useState(null);

  // API Key + mode
  const [screeningMode, setScreeningMode] = useState(() =>
    getSecureItem(LS_KEY) ? "live" : "demo"
  );
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [keyMsg, setKeyMsg] = useState("");

  // Screening view tab
  const [viewMode, setViewMode] = useState("individual");

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Check server-side key on mount — API, LS_KEY, axios, getSecureItem are module-level constants
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await axios.get(`${API}/settings/screening-status`, { withCredentials: true });
        const serverLive = data?.sanctions_io?.mode === "live";
        const localKey = getSecureItem(LS_KEY);
        setScreeningMode(serverLive || localKey ? "live" : "demo");
      } catch (err) {
        logger.error("Failed to check screening status:", err);
      }
    };
    check();
  }, []);

  // Save key — to session + backend
  const handleSaveKey = async () => {
    const key = apiKeyInput.trim();
    if (!key) return;
    setSavingKey(true);
    setKeyMsg("");
    try {
      const { data } = await axios.post(
        `${API}/settings/sanctions-api-key`,
        { api_key: key },
        { withCredentials: true }
      );
      setSecureItem(LS_KEY, key);
      setScreeningMode("live");
      setKeyMsg(data.message || "API key saved & activated");
      setApiKeyInput("");
      setTimeout(() => { setShowKeyModal(false); setKeyMsg(""); }, 1500);
    } catch (err) {
      const detail = err.response?.data?.detail || "";
      if (err.response?.status === 400 && detail.includes("Invalid")) {
        setKeyMsg("Invalid key — check your Sanctions.io dashboard");
      } else {
        setSecureItem(LS_KEY, key);
        setScreeningMode("live");
        setKeyMsg("Key saved in session. Will use it for screening.");
        setTimeout(() => { setShowKeyModal(false); setKeyMsg(""); }, 1500);
      }
    } finally {
      setSavingKey(false);
    }
  };

  const handleRemoveKey = async () => {
    removeSecureItem(LS_KEY);
    setScreeningMode("demo");
    setApiKeyInput("");
    setKeyMsg("Switched to Demo Mode");
    try {
      await axios.delete(`${API}/settings/sanctions-api-key`, { withCredentials: true });
    } catch (err) {
      logger.error("Failed to remove API key from server:", err);
    }
    setTimeout(() => { setShowKeyModal(false); setKeyMsg(""); }, 1200);
  };

  // Fetch history — API, axios, logger are module-level constants; only reactive deps listed
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

  // Run screening
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

      const localKey = getSecureItem(LS_KEY);
      if (localKey) {
        payload.api_key = localKey;
      }

      const [result] = await Promise.all([
        axios.post(`${API}/screenings/run`, payload, { withCredentials: true }).then((r) => r.data),
        new Promise((resolve) => setTimeout(resolve, (form.checks.length + 1) * 600 + 400)),
      ]);

      // If the result came back as demo but we expected live, show toast
      if (localKey && result.mode === "demo" && result.api_error) {
        showToast("API Error — falling back to demo mode");
      }

      setLatestResult(result);
      setIsComplete(true);
      setForm(INITIAL_FORM);
      await fetchScreenings(1);
    } catch (err) {
      logger.error("Screening failed:", err);
      showToast("Screening request failed — please try again");
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
      checks: s.checks_run || ["sanctions", "pep", "adverse_media"],
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

  const hasLocalKey = !!getSecureItem(LS_KEY);

  return (
    <div data-testid="screening-hub-page">
      {/* Toast Notification */}
      {toast && (
        <div data-testid="screening-toast" style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          padding: "12px 20px", borderRadius: "8px",
          background: toast.type === "error" ? "rgba(239,68,68,0.95)" : "rgba(16,185,129,0.95)",
          color: "#fff", fontSize: "13px", fontWeight: 600,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", gap: "8px",
          animation: "slideIn 0.3s ease",
        }}>
          {toast.type === "error" ? "!" : "\u2713"} {toast.msg}
          <button onClick={() => setToast(null)} style={{
            background: "transparent", border: "none", color: "#fff", cursor: "pointer",
            marginLeft: "8px", fontSize: "16px", lineHeight: 1,
          }}>&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "-0.5px", color: "#f1f5f9" }}
                data-testid="screening-hub-title">
              Screening
            </h1>
            {/* Live / Demo Mode Badge */}
            <div data-testid="screening-mode-indicator" className="flex items-center gap-1.5" style={{
              padding: "3px 10px", borderRadius: "99px", fontSize: "10px", fontWeight: 700,
              background: screeningMode === "live" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
              border: `1px solid ${screeningMode === "live" ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
              color: screeningMode === "live" ? "#10b981" : "#f59e0b",
              textTransform: "uppercase", letterSpacing: "0.5px",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: screeningMode === "live" ? "#10b981" : "#f59e0b",
                display: "inline-block",
              }} />
              {screeningMode === "live" ? "Live" : "Demo Mode"}
            </div>
          </div>
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>
            {screeningMode === "live"
              ? "Live screening via Sanctions.io \u2014 75+ sanctions lists, 1M+ PEP records, adverse media & criminal watchlists"
              : "Run sanctions, PEP, adverse media & KYC screenings"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Gear Icon → API Key Modal */}
          <button
            onClick={() => { setShowKeyModal(true); setKeyMsg(""); }}
            data-testid="screening-settings-btn"
            title="API Key Settings"
            style={{
              width: 36, height: 36, borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid #1e2530", background: "transparent",
              color: screeningMode === "live" ? "#10b981" : "#94a3b8",
              cursor: "pointer", transition: "all 0.15s",
              position: "relative",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#131923"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <Settings style={{ width: 16, height: 16 }} />
            {screeningMode === "live" && (
              <span style={{
                position: "absolute", top: -2, right: -2,
                width: 8, height: 8, borderRadius: "50%",
                background: "#10b981", border: "2px solid #080c12",
              }} />
            )}
          </button>
          <button onClick={() => { setShowForm(true); setLatestResult(null); setIsComplete(false); }}
            className="btn-primary" data-testid="new-screening-btn"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Plus className="w-4 h-4" /> New Screening
          </button>
        </div>
      </div>

      {/* API Key Modal */}
      {showKeyModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9000,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={(e) => { if (e.target === e.currentTarget) { setShowKeyModal(false); setKeyMsg(""); } }}>
          <div data-testid="api-key-modal" style={{
            width: "100%", maxWidth: 480, background: "#0d1117",
            border: "1px solid #1e2530", borderRadius: "12px",
            padding: "24px", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Shield style={{ width: 18, height: 18, color: "#2563eb" }} />
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#f1f5f9" }}>Sanctions.io API Key</span>
              </div>
              <button onClick={() => { setShowKeyModal(false); setKeyMsg(""); }}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#475569" }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current status */}
            <div className="flex items-center gap-2 mb-4" style={{
              padding: "10px 14px", borderRadius: "8px",
              background: screeningMode === "live" ? "rgba(16,185,129,0.06)" : "rgba(245,158,11,0.06)",
              border: `1px solid ${screeningMode === "live" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)"}`,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: screeningMode === "live" ? "#10b981" : "#f59e0b",
              }} />
              <span style={{ fontSize: "12px", fontWeight: 600, color: screeningMode === "live" ? "#10b981" : "#f59e0b" }}>
                {screeningMode === "live" ? "Live API Connected" : "Demo Mode"}
              </span>
              <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "auto" }}>
                {screeningMode === "live" ? "75+ lists active" : "Using sample data"}
              </span>
            </div>

            {/* API Key Input */}
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "6px", display: "block" }}>
              API Key
            </label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={hasLocalKey ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022 (key saved)" : "Enter your Sanctions.io API key..."}
              data-testid="api-key-input"
              onKeyDown={(e) => e.key === "Enter" && handleSaveKey()}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: "8px",
                background: "#080c12", border: "1px solid #1e2530", color: "#f1f5f9",
                fontSize: "13px", outline: "none", marginBottom: "12px",
                boxSizing: "border-box",
              }}
            />

            {keyMsg && (
              <p data-testid="api-key-msg" style={{
                fontSize: "12px", marginBottom: "12px",
                color: keyMsg.includes("saved") || keyMsg.includes("activated") || keyMsg.includes("Switched")
                  ? "#10b981" : "#f59e0b",
              }}>
                {keyMsg}
              </p>
            )}

            {/* Buttons */}
            <div className="flex items-center gap-2">
              <button onClick={handleSaveKey} disabled={savingKey || !apiKeyInput.trim()}
                data-testid="save-api-key-btn"
                style={{
                  flex: 1, padding: "10px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                  background: savingKey || !apiKeyInput.trim() ? "#1e2530" : "#2563eb",
                  color: "#fff", border: "none",
                  cursor: savingKey || !apiKeyInput.trim() ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                }}>
                {savingKey ? "Validating..." : "Save & Activate"}
              </button>
              {hasLocalKey && (
                <button onClick={handleRemoveKey} data-testid="remove-api-key-btn"
                  style={{
                    padding: "10px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                    border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)",
                    color: "#ef4444", cursor: "pointer",
                  }}>
                  Remove Key
                </button>
              )}
            </div>

            <p style={{ fontSize: "11px", color: "#475569", marginTop: "14px", lineHeight: 1.5 }}>
              Get your API key from{" "}
              <a href="https://sanctions.io" target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>
                sanctions.io
              </a>
              {" "}&mdash; Covers 75+ sanctions lists, 1M+ PEP records, adverse media &amp; criminal watchlists.
            </p>
          </div>
        </div>
      )}

      {/* Screening Mode Tabs */}
      <div data-testid="screening-mode-tabs" style={{
        display: "flex", gap: "4px", marginBottom: "20px",
        background: "#0d1117", border: "1px solid #1e2530", borderRadius: "10px", padding: "4px",
        maxWidth: "320px",
      }}>
        {[
          { id: "individual", label: "Individual", icon: Search },
          { id: "bulk", label: "Bulk Upload", icon: FileSpreadsheet },
        ].map((tab) => {
          const TabIcon = tab.icon;
          const isActive = viewMode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              data-testid={`tab-${tab.id}`}
              style={{
                flex: 1, padding: "8px 14px", borderRadius: "7px", border: "none",
                background: isActive ? "rgba(37,99,235,0.12)" : "transparent",
                color: isActive ? "#2563eb" : "#94a3b8",
                fontSize: "12px", fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                transition: "all 0.15s",
              }}
            >
              <TabIcon style={{ width: "13px", height: "13px" }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Bulk Screening Panel */}
      {viewMode === "bulk" && (
        <BulkScreeningPanel onScreeningComplete={() => fetchScreenings(1)} />
      )}

      {/* Individual Screening */}
      {viewMode === "individual" && (
        <>
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
        </>
      )}

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
