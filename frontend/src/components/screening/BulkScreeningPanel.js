import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import logger from "../../utils/logger";
import {
  Upload, Download, Play, FileSpreadsheet, Clock,
  CheckCircle, AlertTriangle, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { getSecureItem } from "../../utils/secureStorage";
import { riskScoreColor } from "../../utils/styleHelpers";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SLA_STYLES = {
  on_time: { color: "#10b981", bg: "rgba(16,185,129,0.12)", label: "On Time" },
  at_risk: { color: "#FFD700", bg: "rgba(255,215,0,0.1)", label: "At Risk" },
  breached: { color: "#8B0000", bg: "rgba(139,0,0,0.15)", label: "Breached" },
};

export function BulkScreeningPanel({ onScreeningComplete }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [batchId, setBatchId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [screening, setScreening] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const fetchHistory = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/screenings/bulk/history`, { withCredentials: true });
      setHistory(data.batches || []);
    } catch (err) {
      logger.error("Failed to fetch bulk history:", err);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleTemplateDownload = async () => {
    try {
      const res = await axios.get(`${API}/screenings/bulk/csv-template`, {
        withCredentials: true,
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rudrik_screening_template.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      logger.error("Failed to download template:", err);
    }
  };

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.name.endsWith(".csv")) {
      setError("Please upload a .csv file");
      return;
    }
    setFile(f);
    setError("");
    setPreview(null);
    setResults(null);
    setBatchId(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await axios.post(`${API}/screenings/bulk/upload`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPreview(data.preview);
      setBatchId(data.batch_id);
      setProgress({ current: 0, total: data.total });
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed. Check CSV format.");
    } finally {
      setUploading(false);
    }
  };

  const handleRunScreening = async () => {
    if (!batchId) return;
    setScreening(true);
    setError("");

    // Pass session-stored API key if available
    const apiKey = getSecureItem("rudrik_sanctions_api_key");
    const body = apiKey ? { api_key: apiKey } : {};

    try {
      const { data } = await axios.post(
        `${API}/screenings/bulk/${batchId}/run`,
        body,
        { withCredentials: true }
      );
      setResults(data.results);
      setProgress({ current: data.total, total: data.total });
      fetchHistory();
      if (onScreeningComplete) onScreeningComplete();
    } catch (err) {
      setError(err.response?.data?.detail || "Screening failed");
    } finally {
      setScreening(false);
    }
  };

  // Poll progress while screening
  useEffect(() => {
    if (!screening || !batchId) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get(
          `${API}/screenings/bulk/${batchId}/progress`,
          { withCredentials: true }
        );
        setProgress({ current: data.screened_count || 0, total: data.total_entities || 0 });
      } catch (err) {
        logger.error("Bulk progress poll failed:", err);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [screening, batchId]);

  const handleDownload = async (downloadBatchId) => {
    setDownloading(downloadBatchId);
    try {
      const res = await axios.get(
        `${API}/screenings/bulk/${downloadBatchId}/download`,
        { withCredentials: true, responseType: "blob" }
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rudrik_bulk_screening_${downloadBatchId.slice(0, 8)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      logger.error("Failed to download results:", err);
    } finally {
      setDownloading(null);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setBatchId(null);
    setResults(null);
    setError("");
    setProgress({ current: 0, total: 0 });
  };

  const totalMatches = results ? results.filter((r) => r.has_match).length : 0;

  return (
    <div data-testid="bulk-screening-panel">
      {/* Header */}
      <div className="card-aml" style={{ marginBottom: "16px" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div style={{
              width: "38px", height: "38px", borderRadius: "10px",
              background: "rgba(37,99,235,0.12)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <FileSpreadsheet style={{ width: "18px", height: "18px", color: "#2563eb" }} />
            </div>
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#f1f5f9" }}>Bulk Screening</h2>
              <p style={{ fontSize: "11px", color: "#475569" }}>Upload CSV, screen all entities, download Excel results</p>
            </div>
          </div>
          <button
            onClick={handleTemplateDownload}
            data-testid="download-csv-template-btn"
            style={{
              background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.25)",
              borderRadius: "8px", padding: "7px 14px", cursor: "pointer",
              color: "#60a5fa", fontSize: "12px", fontWeight: 600,
              display: "flex", alignItems: "center", gap: "5px",
            }}
          >
            <Download style={{ width: "13px", height: "13px" }} />
            Download CSV Template
          </button>
        </div>

        {/* Upload Zone */}
        {!results && (
          <div style={{
            border: "2px dashed #1e2530", borderRadius: "10px", padding: "24px",
            textAlign: "center", background: "#080c12",
            transition: "border-color 0.2s",
          }}>
            {!file ? (
              <>
                <Upload style={{ width: "28px", height: "28px", color: "#475569", margin: "0 auto 10px" }} />
                <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "8px" }}>
                  Drop your CSV file here or click to browse
                </p>
                <label
                  data-testid="csv-file-input-label"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    borderRadius: "8px", padding: "8px 20px", cursor: "pointer",
                    color: "#fff", fontSize: "12px", fontWeight: 600,
                  }}
                >
                  <Upload style={{ width: "13px", height: "13px" }} />
                  Choose File
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    data-testid="csv-file-input"
                    style={{ display: "none" }}
                  />
                </label>
                <p style={{ fontSize: "10px", color: "#475569", marginTop: "10px" }}>
                  Required column: <strong>name</strong>. Optional: dob, nationality, id_type, id_number
                </p>
              </>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet style={{ width: "20px", height: "20px", color: "#10b981" }} />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9" }}>{file.name}</span>
                <button
                  onClick={handleReset}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "#475569", padding: "2px" }}
                >
                  <X style={{ width: "14px", height: "14px" }} />
                </button>
                {!preview && (
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    data-testid="upload-csv-btn"
                    style={{
                      background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                      border: "none", borderRadius: "8px", padding: "8px 20px",
                      cursor: uploading ? "not-allowed" : "pointer",
                      color: "#fff", fontSize: "12px", fontWeight: 600,
                      opacity: uploading ? 0.7 : 1,
                      display: "flex", alignItems: "center", gap: "5px",
                    }}
                  >
                    <Upload style={{ width: "13px", height: "13px" }} />
                    {uploading ? "Parsing..." : "Upload & Parse"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {error && (
          <div data-testid="bulk-error" style={{
            marginTop: "12px", padding: "10px 14px", borderRadius: "8px",
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            color: "#ef4444", fontSize: "12px", fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        {/* Preview Table */}
        {preview && !results && (
          <div style={{ marginTop: "16px" }}>
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8" }}>
                Preview: {progress.total} entities found
              </span>
              <button
                onClick={handleRunScreening}
                disabled={screening}
                data-testid="run-bulk-screening-btn"
                style={{
                  background: screening ? "#1e2530" : "linear-gradient(135deg, #10b981, #059669)",
                  border: "none", borderRadius: "8px", padding: "9px 22px",
                  cursor: screening ? "not-allowed" : "pointer",
                  color: "#fff", fontSize: "13px", fontWeight: 600,
                  display: "flex", alignItems: "center", gap: "6px",
                }}
              >
                <Play style={{ width: "14px", height: "14px" }} />
                {screening ? `Screening ${progress.current}/${progress.total}...` : "Screen All"}
              </button>
            </div>

            {/* Progress Bar */}
            {screening && (
              <div data-testid="bulk-progress-bar" style={{ marginBottom: "12px" }}>
                <div style={{
                  width: "100%", height: "6px", background: "#1e2530",
                  borderRadius: "3px", overflow: "hidden",
                }}>
                  <div style={{
                    width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #2563eb, #10b981)",
                    borderRadius: "3px",
                    transition: "width 0.5s ease",
                  }} />
                </div>
                <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", textAlign: "center" }}>
                  Screening {progress.current}/{progress.total} entities...
                </p>
              </div>
            )}

            <div style={{
              borderRadius: "8px", overflow: "hidden",
              border: "1px solid #1e2530",
            }}>
              <div style={{
                display: "grid", gridTemplateColumns: "0.3fr 2fr 1fr 0.8fr 0.8fr 1fr",
                gap: "8px", padding: "10px 16px", background: "#080c12",
                fontSize: "9px", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "1.5px", color: "#475569",
              }}>
                <span>#</span>
                <span>Name</span>
                <span>Nationality</span>
                <span>DOB</span>
                <span>ID Type</span>
                <span>ID Number</span>
              </div>
              {preview.map((row) => (
                <div key={row.row_num} style={{
                  display: "grid", gridTemplateColumns: "0.3fr 2fr 1fr 0.8fr 0.8fr 1fr",
                  gap: "8px", padding: "10px 16px",
                  borderTop: "1px solid #0f1520", fontSize: "12px",
                }}>
                  <span style={{ color: "#475569" }}>{row.row_num}</span>
                  <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{row.name}</span>
                  <span style={{ color: "#94a3b8" }}>{row.nationality || "—"}</span>
                  <span style={{ color: "#94a3b8" }}>{row.dob || "—"}</span>
                  <span style={{ color: "#94a3b8" }}>{row.id_type || "—"}</span>
                  <span style={{ color: "#94a3b8" }}>{row.id_number || "—"}</span>
                </div>
              ))}
              {progress.total > 10 && (
                <div style={{ padding: "8px 16px", textAlign: "center", color: "#475569", fontSize: "11px", borderTop: "1px solid #0f1520" }}>
                  ... and {progress.total - 10} more entities
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results Table */}
        {results && (
          <div data-testid="bulk-results" style={{ marginTop: "16px" }}>
            {/* Summary Bar */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#f1f5f9" }}>
                  Results: {results.length} screened
                </span>
                <span style={{
                  fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "4px",
                  background: totalMatches > 0 ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
                  color: totalMatches > 0 ? "#ef4444" : "#10b981",
                }}>
                  {totalMatches} match{totalMatches !== 1 ? "es" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(batchId)}
                  disabled={downloading === batchId}
                  data-testid="download-results-btn"
                  style={{
                    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    border: "none", borderRadius: "8px", padding: "8px 18px",
                    cursor: "pointer", color: "#fff", fontSize: "12px", fontWeight: 600,
                    display: "flex", alignItems: "center", gap: "5px",
                    opacity: downloading === batchId ? 0.7 : 1,
                  }}
                >
                  <Download style={{ width: "13px", height: "13px" }} />
                  {downloading === batchId ? "Generating..." : "Download Excel"}
                </button>
                <button
                  onClick={handleReset}
                  data-testid="new-bulk-screening-btn"
                  style={{
                    background: "transparent", border: "1px solid #1e2530",
                    borderRadius: "8px", padding: "8px 14px", cursor: "pointer",
                    color: "#94a3b8", fontSize: "12px", fontWeight: 600,
                  }}
                >
                  New Batch
                </button>
              </div>
            </div>

            {/* Results Grid */}
            <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #1e2530" }}>
              <div style={{
                display: "grid", gridTemplateColumns: "2fr 0.8fr 0.8fr 1.2fr 0.7fr",
                gap: "8px", padding: "10px 16px", background: "#080c12",
                fontSize: "9px", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "1.5px", color: "#475569",
              }}>
                <span>Name</span>
                <span>Match</span>
                <span>Risk Score</span>
                <span>Match Type</span>
                <span>SLA</span>
              </div>
              {results.map((r, i) => {
                const matchTypes = [];
                if (r.sanctions_match) matchTypes.push("Sanction");
                if (r.pep_match) matchTypes.push("PEP");
                if (r.adverse_media_match) matchTypes.push("Adv. Media");
                const sla = SLA_STYLES[r.sla_status] || SLA_STYLES.on_time;

                return (
                  <div key={r.screening_id} data-testid={`bulk-result-${r.screening_id}`} style={{
                    display: "grid", gridTemplateColumns: "2fr 0.8fr 0.8fr 1.2fr 0.7fr",
                    gap: "8px", padding: "12px 16px",
                    borderTop: "1px solid #0f1520", alignItems: "center",
                  }}>
                    <div>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9" }}>{r.full_name}</span>
                      <div style={{ fontSize: "10px", color: "#475569" }}>{r.nationality || ""}</div>
                    </div>
                    <span style={{
                      fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "4px",
                      display: "inline-block", width: "fit-content",
                      background: r.has_match ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
                      color: r.has_match ? "#ef4444" : "#10b981",
                    }}>
                      {r.has_match ? "YES" : "NO"}
                    </span>
                    <span style={{
                      fontSize: "14px", fontWeight: 700,
                      color: riskScoreColor(r.risk_score),
                    }}>
                      {r.risk_score}
                    </span>
                    <div className="flex gap-1 flex-wrap">
                      {matchTypes.length > 0 ? matchTypes.map((t) => (
                        <span key={t} style={{
                          fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "3px",
                          background: "rgba(239,68,68,0.1)", color: "#ef4444", textTransform: "uppercase",
                        }}>
                          {t}
                        </span>
                      )) : (
                        <span style={{ fontSize: "10px", color: "#475569" }}>None</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock style={{ width: "10px", height: "10px", color: sla.color }} />
                      <span style={{
                        fontSize: "9px", fontWeight: 700, padding: "2px 5px", borderRadius: "3px",
                        background: sla.bg, color: sla.color, textTransform: "uppercase",
                      }}>
                        {sla.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Batch History */}
      {history.length > 0 && (
        <div className="card-aml" data-testid="bulk-history-section">
          <button
            onClick={() => setShowHistory(!showHistory)}
            data-testid="toggle-bulk-history"
            className="flex items-center justify-between w-full"
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "#f1f5f9", padding: 0, width: "100%",
            }}
          >
            <div className="flex items-center gap-2">
              <Clock style={{ width: "14px", height: "14px", color: "#475569" }} />
              <span style={{ fontSize: "13px", fontWeight: 700 }}>Batch History</span>
              <span style={{
                fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "10px",
                background: "rgba(37,99,235,0.12)", color: "#60a5fa",
              }}>
                {history.length}
              </span>
            </div>
            {showHistory
              ? <ChevronUp style={{ width: "14px", height: "14px", color: "#475569" }} />
              : <ChevronDown style={{ width: "14px", height: "14px", color: "#475569" }} />
            }
          </button>

          {showHistory && (
            <div style={{ marginTop: "12px" }}>
              <div style={{
                display: "grid", gridTemplateColumns: "1.5fr 0.8fr 0.8fr 0.8fr 1fr 0.8fr",
                gap: "8px", padding: "8px 12px",
                fontSize: "9px", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "1.5px", color: "#475569",
              }}>
                <span>Date</span>
                <span>File</span>
                <span>Entities</span>
                <span>Matches</span>
                <span>Status</span>
                <span>Action</span>
              </div>
              {history.map((b) => (
                <div key={b.batch_id} data-testid={`batch-${b.batch_id}`} style={{
                  display: "grid", gridTemplateColumns: "1.5fr 0.8fr 0.8fr 0.8fr 1fr 0.8fr",
                  gap: "8px", padding: "10px 12px",
                  borderTop: "1px solid #0f1520", alignItems: "center",
                }}>
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                    {new Date(b.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span style={{ fontSize: "11px", color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {b.filename || "—"}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#f1f5f9" }}>{b.total_entities}</span>
                  <span style={{
                    fontSize: "12px", fontWeight: 700,
                    color: (b.match_count || 0) > 0 ? "#ef4444" : "#10b981",
                  }}>
                    {b.match_count || 0}
                  </span>
                  <span style={{
                    fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "4px",
                    display: "inline-block", width: "fit-content", textTransform: "uppercase",
                    background: b.status === "completed" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                    color: b.status === "completed" ? "#10b981" : "#f59e0b",
                  }}>
                    {b.status}
                  </span>
                  {b.status === "completed" ? (
                    <button
                      onClick={() => handleDownload(b.batch_id)}
                      disabled={downloading === b.batch_id}
                      data-testid={`download-batch-${b.batch_id}`}
                      style={{
                        background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.25)",
                        borderRadius: "6px", padding: "4px 10px", cursor: "pointer",
                        color: "#60a5fa", fontSize: "10px", fontWeight: 600,
                        display: "flex", alignItems: "center", gap: "4px",
                        opacity: downloading === b.batch_id ? 0.6 : 1,
                      }}
                    >
                      <Download style={{ width: "10px", height: "10px" }} />
                      Excel
                    </button>
                  ) : (
                    <span style={{ fontSize: "10px", color: "#475569" }}>—</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
