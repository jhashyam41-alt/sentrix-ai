import React, { useState, useCallback } from "react";
import axios from "axios";
import { Search, Shield, Users, AlertTriangle, Loader2, CheckCircle, XCircle } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RISK_COLORS = {
  LOW: "#10b981",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
  CRITICAL: "#dc2626",
};

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
      console.error("Failed to fetch integration status");
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

      // Use internal screening endpoint (authenticated)
      const { data } = await axios.post(`${API}/screening/run-quick`, payload, {
        withCredentials: true,
      });
      setResult(data);
    } catch (err) {
      // Fallback: try using v1 public API if available
      try {
        const keysRes = await axios.get(`${API}/api-keys`, { withCredentials: true });
        const activeKey = keysRes.data.api_keys?.find((k) => k.is_active);
        if (activeKey) {
          const payload = { name: name.trim(), checks, nationality: nationality || undefined };
          const { data } = await axios.post(
            `${process.env.REACT_APP_BACKEND_URL}/api/v1/screen`,
            payload,
            { headers: { "X-API-Key": activeKey.api_key } }
          );
          setResult(data);
        } else {
          setResult({ error: "No active API keys. Create one in API Keys page." });
        }
      } catch (innerErr) {
        setResult({ error: innerErr.response?.data?.detail || "Screening failed" });
      }
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
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="card-aml">
              <h2 style={{ fontSize: "13px", fontWeight: 700, color: "#f1f5f9", marginBottom: "16px" }}>
                Individual Screening
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px", display: "block" }}>Full Name *</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="John Smith" className="input-aml w-full" data-testid="screening-name-input" />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px", display: "block" }}>Nationality</label>
                  <input type="text" value={nationality} onChange={(e) => setNationality(e.target.value)}
                    placeholder="US" className="input-aml w-full" data-testid="screening-nationality-input" />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px", display: "block" }}>Date of Birth</label>
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                    className="input-aml w-full" data-testid="screening-dob-input"
                    style={{ colorScheme: "dark" }} />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px", display: "block" }}>ID Type</label>
                  <select value={idType} onChange={(e) => setIdType(e.target.value)}
                    className="input-aml w-full" data-testid="screening-id-type"
                    style={{ colorScheme: "dark" }}>
                    <option value="">None</option>
                    <option value="PAN">PAN</option>
                    <option value="AADHAAR">Aadhaar</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="VOTER_ID">Voter ID</option>
                    <option value="DL">Driving License</option>
                  </select>
                </div>
                {idType && (
                  <div className="md:col-span-2">
                    <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px", display: "block" }}>ID Number</label>
                    <input type="text" value={idNumber} onChange={(e) => setIdNumber(e.target.value)}
                      placeholder="Enter ID number" className="input-aml w-full" data-testid="screening-id-number" />
                  </div>
                )}
              </div>

              {/* Checks */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "8px", display: "block" }}>Checks</label>
                <div className="flex gap-2 flex-wrap">
                  {["sanctions", "pep", "kyc"].map((c) => (
                    <button key={c} onClick={() => toggleCheck(c)}
                      data-testid={`check-${c}`}
                      style={{
                        padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                        border: checks.includes(c) ? "1px solid #2563eb" : "1px solid #1e2530",
                        background: checks.includes(c) ? "rgba(37,99,235,0.15)" : "transparent",
                        color: checks.includes(c) ? "#60a5fa" : "#94a3b8",
                        textTransform: "uppercase",
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={runScreening} disabled={screening || !name.trim()}
                className="btn-primary" data-testid="run-screening-btn"
                style={{ display: "flex", alignItems: "center", gap: "8px", opacity: screening ? 0.5 : 1 }}>
                {screening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {screening ? "Screening..." : "Run Screening"}
              </button>
            </div>
          </div>

          {/* Result */}
          <div>
            {result && !result.error && (
              <div className="card-aml" data-testid="screening-result">
                <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#f1f5f9", marginBottom: "12px" }}>
                  Result
                </h3>
                <div className="space-y-3">
                  <div>
                    <div style={{ fontSize: "11px", color: "#475569", marginBottom: "2px" }}>Risk Level</div>
                    <span style={{
                      fontSize: "18px", fontWeight: 700,
                      color: RISK_COLORS[result.riskLevel] || RISK_COLORS[result.risk_level] || "#94a3b8",
                    }}>
                      {result.riskLevel || result.risk_level || "N/A"}
                    </span>
                  </div>
                  {result.sanctions && (
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: "13px", color: "#94a3b8" }}>Sanctions</span>
                      <span style={{
                        display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 600,
                        color: result.sanctions.status === "clear" ? "#10b981" : "#ef4444",
                      }}>
                        {result.sanctions.status === "clear" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {result.sanctions.status}
                      </span>
                    </div>
                  )}
                  {result.pep && (
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: "13px", color: "#94a3b8" }}>PEP</span>
                      <span style={{
                        display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 600,
                        color: result.pep.status === "clear" ? "#10b981" : "#ef4444",
                      }}>
                        {result.pep.status === "clear" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {result.pep.status}
                      </span>
                    </div>
                  )}
                  {result.kyc && (
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: "13px", color: "#94a3b8" }}>KYC</span>
                      <span style={{
                        display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 600,
                        color: result.kyc.status === "verified" ? "#10b981" : "#ef4444",
                      }}>
                        {result.kyc.status === "verified" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {result.kyc.status}
                      </span>
                    </div>
                  )}
                  <div style={{ fontSize: "11px", color: "#475569", borderTop: "1px solid #1e2530", paddingTop: "8px" }}>
                    Mode: {result.mode || "demo"} • {new Date(result.completedAt || result.screened_at).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
            {result?.error && (
              <div className="card-aml" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle style={{ color: "#ef4444", width: 16, height: 16 }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#ef4444" }}>Error</span>
                </div>
                <p style={{ fontSize: "13px", color: "#94a3b8" }}>{result.error}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "batch" && (
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
          <button onClick={runBatchScreening} disabled={screening || !batchText.trim()}
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
      )}
    </div>
  );
}
