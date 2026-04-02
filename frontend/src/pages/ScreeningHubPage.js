import React, { useState, useCallback } from "react";
import axios from "axios";
import logger from "../utils/logger";
import { Search, Shield, Users, Loader2 } from "lucide-react";
import { IndividualScreeningForm } from "../components/screening/IndividualScreeningForm";
import { ScreeningResultCard } from "../components/screening/ScreeningResultCard";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RISK_COLORS = { LOW: "#10b981", MEDIUM: "#f59e0b", HIGH: "#ef4444", CRITICAL: "#dc2626" };

export default function ScreeningHubPage() {
  const [tab, setTab] = useState("individual");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("");
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [checks, setChecks] = useState(["sanctions", "pep"]);
  const [batchText, setBatchText] = useState("");
  const [result, setResult] = useState(null);
  const [batchResult, setBatchResult] = useState(null);
  const [screening, setScreening] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api-keys/integration-status`, { withCredentials: true });
      setIntegrationStatus(data);
    } catch (err) {
      logger.error("Failed to fetch integration status");
    }
  }, []);

  React.useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const toggleCheck = (c) => {
    setChecks((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  };

  const runScreening = async () => {
    if (!name.trim()) return;
    setScreening(true);
    setResult(null);
    try {
      const payload = {
        name: name.trim(),
        checks,
        dateOfBirth: dob || undefined,
        nationality: nationality || undefined,
      };
      if (idType && idNumber) {
        payload.idType = idType;
        payload.idNumber = idNumber;
        if (!checks.includes("kyc")) payload.checks = [...checks, "kyc"];
      }

      const { data } = await axios.post(`${API}/screening/run-quick`, payload, {
        withCredentials: true,
      });
      setResult(data);
    } catch (err) {
      setResult({ error: err.response?.data?.detail || "Screening failed" });
    } finally {
      setScreening(false);
    }
  };

  const runBatchScreening = async () => {
    const lines = batchText.trim().split("\n").filter(Boolean);
    if (lines.length === 0) return;
    setScreening(true);
    setBatchResult(null);
    try {
      const individuals = lines.map((line) => {
        const parts = line.split(",").map((s) => s.trim());
        return { name: parts[0], nationality: parts[1] || undefined };
      });
      const keysRes = await axios.get(`${API}/api-keys`, { withCredentials: true });
      const activeKey = keysRes.data.api_keys?.find((k) => k.is_active);
      if (!activeKey) {
        setBatchResult({ error: "No active API keys. Create one first." });
        return;
      }
      const { data } = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/v1/screening/batch`,
        { individuals },
        { headers: { "X-API-Key": activeKey.api_key } }
      );
      setBatchResult(data);
    } catch (err) {
      setBatchResult({ error: err.response?.data?.detail || "Batch screening failed" });
    } finally {
      setScreening(false);
    }
  };

  return (
    <div data-testid="screening-hub-page">
      <div className="mb-8">
        <h1 style={{ fontSize: "26px", fontWeight: "700", letterSpacing: "-0.5px", color: "#f1f5f9", marginBottom: "8px" }}
            data-testid="screening-hub-title">
          Screening Hub
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "14px" }}>
          Run sanctions, PEP, and adverse media screenings
        </p>
      </div>

      {/* Integration Status */}
      {integrationStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {Object.entries(integrationStatus).map(([svc, info]) => (
            <div key={svc} className="card-aml" style={{ padding: "16px" }} data-testid={`integration-status-${svc}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield style={{ width: 16, height: 16, color: info.mode === "live" ? "#10b981" : "#f59e0b" }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9", textTransform: "capitalize" }}>
                    {svc}
                  </span>
                </div>
                <span style={{
                  fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "4px",
                  color: info.mode === "live" ? "#10b981" : "#f59e0b",
                  background: info.mode === "live" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                  textTransform: "uppercase",
                }}>
                  {info.mode}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: "individual", label: "Individual", icon: Search },
          { key: "batch", label: "Batch", icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            data-testid={`screening-tab-${key}`}
            style={{
              display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px",
              borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer",
              border: tab === key ? "1px solid #2563eb" : "1px solid #1e2530",
              background: tab === key ? "rgba(37,99,235,0.12)" : "#0d1117",
              color: tab === key ? "#60a5fa" : "#94a3b8",
              transition: "all 0.2s",
            }}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "individual" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <IndividualScreeningForm
              name={name} setName={setName} dob={dob} setDob={setDob}
              nationality={nationality} setNationality={setNationality}
              idType={idType} setIdType={setIdType}
              idNumber={idNumber} setIdNumber={setIdNumber}
              checks={checks} toggleCheck={toggleCheck}
              screening={screening} onSubmit={runScreening}
            />
          </div>
          <div>
            <ScreeningResultCard result={result} />
          </div>
        </div>
      )}

      {tab === "batch" && (
        <BatchScreeningPanel
          batchText={batchText} setBatchText={setBatchText}
          screening={screening} onSubmit={runBatchScreening}
          batchResult={batchResult}
        />
      )}
    </div>
  );
}

function BatchScreeningPanel({ batchText, setBatchText, screening, onSubmit, batchResult }) {
  return (
    <div className="card-aml">
      <h2 style={{ fontSize: "13px", fontWeight: 700, color: "#f1f5f9", marginBottom: "8px" }}>
        Batch Screening
      </h2>
      <p style={{ fontSize: "12px", color: "#475569", marginBottom: "12px" }}>
        Enter one person per line: Name, Nationality (max 50)
      </p>
      <textarea
        value={batchText}
        onChange={(e) => setBatchText(e.target.value)}
        rows={8}
        className="input-aml w-full"
        data-testid="batch-input"
        placeholder={"John Smith, US\nJane Doe, GB\nAhmed Khan, PK"}
        style={{ resize: "vertical", fontSize: "13px", fontFamily: "monospace" }}
      />
      <button onClick={onSubmit} disabled={screening || !batchText.trim()}
        className="btn-primary mt-4" data-testid="run-batch-btn"
        style={{ display: "flex", alignItems: "center", gap: "8px", opacity: screening ? 0.5 : 1 }}>
        {screening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
        {screening ? "Processing..." : "Run Batch"}
      </button>

      {batchResult && !batchResult.error && (
        <div style={{ marginTop: "20px" }} data-testid="batch-result">
          <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#f1f5f9", marginBottom: "12px" }}>
            Batch Results — {batchResult.summary?.total || 0} screened
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "High Risk", val: batchResult.summary?.high || 0, color: "#ef4444" },
              { label: "Medium", val: batchResult.summary?.medium || 0, color: "#f59e0b" },
              { label: "Low", val: batchResult.summary?.low || 0, color: "#10b981" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center", padding: "12px", background: "#080c12", borderRadius: "8px" }}>
                <div style={{ fontSize: "20px", fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: "11px", color: "#475569" }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {batchResult.results?.map((r, i) => (
              <div key={r.screening_id || i} className="flex items-center justify-between"
                style={{ padding: "8px 12px", background: "#080c12", borderRadius: "6px", border: "1px solid #1e2530" }}>
                <span style={{ fontSize: "13px", color: "#f1f5f9" }}>{r.screened_name}</span>
                <span style={{
                  fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "4px",
                  color: RISK_COLORS[r.risk_level] || "#94a3b8",
                  background: `${RISK_COLORS[r.risk_level] || "#94a3b8"}22`,
                }}>
                  {r.risk_level}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {batchResult?.error && (
        <div style={{ marginTop: "16px", padding: "12px", background: "rgba(239,68,68,0.08)", borderRadius: "8px", color: "#ef4444", fontSize: "13px" }}>
          {batchResult.error}
        </div>
      )}
    </div>
  );
}
