import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Key, Plus, Trash2, Copy, Check, Activity, Loader2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function APIKeysPage() {
  const [keys, setKeys] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [clientName, setClientName] = useState("");
  const [rateLimit, setRateLimit] = useState(60);
  const [newKey, setNewKey] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  const fetchKeys = useCallback(async () => {
    try {
      const [keysRes, usageRes] = await Promise.all([
        axios.get(`${API}/api-keys`, { withCredentials: true }),
        axios.get(`${API}/api-keys/usage`, { withCredentials: true }),
      ]);
      setKeys(keysRes.data.api_keys || []);
      setUsage(usageRes.data);
    } catch (err) {
      console.error("Failed to fetch API keys:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const createKey = async () => {
    if (!clientName.trim()) return;
    setCreating(true);
    try {
      const { data } = await axios.post(
        `${API}/api-keys`,
        { client_name: clientName.trim(), rate_limit: rateLimit },
        { withCredentials: true }
      );
      setNewKey(data);
      setClientName("");
      setShowCreate(false);
      await fetchKeys();
    } catch (err) {
      console.error("Failed to create key:", err);
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (keyId) => {
    if (!window.confirm("Revoke this API key? This cannot be undone.")) return;
    try {
      await axios.put(`${API}/api-keys/${keyId}/revoke`, {}, { withCredentials: true });
      await fetchKeys();
    } catch (err) {
      console.error("Failed to revoke key:", err);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div style={{ color: "#94a3b8" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div data-testid="api-keys-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: "700", letterSpacing: "-0.5px", color: "#f1f5f9", marginBottom: "8px" }}
              data-testid="api-keys-title">
            API Keys
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>
            Manage API keys for public screening endpoints
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary"
          data-testid="create-api-key-btn"
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <Plus className="w-4 h-4" /> Create Key
        </button>
      </div>

      {/* Usage Stats */}
      {usage && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total API Calls", value: usage.total_calls, color: "#2563eb" },
            { label: "Today's Calls", value: usage.today_calls, color: "#10b981" },
            { label: "Active Keys", value: usage.active_keys, color: "#f59e0b" },
          ].map((s) => (
            <div key={s.label} className="card-aml" data-testid={`usage-stat-${s.label.toLowerCase().replace(/[' ]/g, '-')}`}>
              <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "2px", color: "#475569", marginBottom: "4px" }}>
                {s.label}
              </div>
              <div style={{ fontSize: "28px", fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* New Key Display */}
      {newKey && (
        <div style={{
          background: "rgba(37,99,235,0.08)",
          border: "1px solid rgba(37,99,235,0.3)",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "24px",
        }} data-testid="new-key-display">
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#60a5fa", marginBottom: "12px" }}>
            New API Key Created — Save these credentials now!
          </div>
          {[
            { label: "API Key", value: newKey.api_key, field: "api_key" },
            { label: "Secret Key", value: newKey.secret_key, field: "secret_key" },
          ].map(({ label, value, field }) => (
            <div key={field} className="flex items-center gap-3 mb-2">
              <span style={{ fontSize: "12px", color: "#94a3b8", minWidth: "80px" }}>{label}:</span>
              <code style={{ flex: 1, fontSize: "12px", color: "#f1f5f9", background: "#080c12", padding: "6px 10px", borderRadius: "6px", fontFamily: "monospace", wordBreak: "break-all" }}>
                {value}
              </code>
              <button
                onClick={() => copyToClipboard(value, field)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: copiedField === field ? "#10b981" : "#94a3b8" }}
                data-testid={`copy-${field}`}
              >
                {copiedField === field ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          ))}
          <button
            onClick={() => setNewKey(null)}
            style={{ fontSize: "12px", color: "#475569", marginTop: "8px", background: "transparent", border: "none", cursor: "pointer" }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create Key Modal */}
      {showCreate && (
        <div className="card-aml" style={{ marginBottom: "24px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#f1f5f9", marginBottom: "16px" }}>
            Create New API Key
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px", display: "block" }}>Client Name</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g., FinTech Corp"
                className="input-aml w-full"
                data-testid="client-name-input"
              />
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px", display: "block" }}>Rate Limit (per min)</label>
              <input
                type="number"
                value={rateLimit}
                onChange={(e) => setRateLimit(Number(e.target.value))}
                className="input-aml w-full"
                data-testid="rate-limit-input"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={createKey}
              disabled={creating || !clientName.trim()}
              className="btn-primary"
              data-testid="confirm-create-key"
              style={{ display: "flex", alignItems: "center", gap: "6px", opacity: creating ? 0.5 : 1 }}
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              style={{ background: "transparent", border: "1px solid #1e2530", borderRadius: "8px", padding: "8px 16px", color: "#94a3b8", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys List */}
      <div className="card-aml">
        <h2 style={{ fontSize: "13px", fontWeight: 700, color: "#f1f5f9", marginBottom: "16px" }}>
          API Keys ({keys.length})
        </h2>
        {keys.length === 0 ? (
          <div style={{ color: "#475569", textAlign: "center", padding: "40px 0" }}>
            No API keys created yet
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((k) => (
              <div
                key={k.id}
                data-testid={`api-key-row-${k.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "#080c12",
                  borderRadius: "8px",
                  border: "1px solid #1e2530",
                }}
              >
                <div className="flex items-center gap-3">
                  <Key style={{ color: k.is_active ? "#2563eb" : "#475569", width: 16, height: 16 }} />
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: k.is_active ? "#f1f5f9" : "#475569" }}>
                      {k.client_name}
                    </div>
                    <div style={{ fontSize: "11px", color: "#475569", fontFamily: "monospace" }}>
                      {k.api_key?.slice(0, 16)}...
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span style={{
                    fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "4px",
                    textTransform: "uppercase",
                    color: k.is_active ? "#10b981" : "#ef4444",
                    background: k.is_active ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                  }}>
                    {k.is_active ? "Active" : "Revoked"}
                  </span>
                  <span style={{ fontSize: "11px", color: "#475569" }}>
                    {k.rate_limit_per_minute}/min
                  </span>
                  {k.is_active && (
                    <button
                      onClick={() => revokeKey(k.id)}
                      data-testid={`revoke-key-${k.id}`}
                      style={{
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.3)",
                        borderRadius: "6px",
                        padding: "4px 8px",
                        cursor: "pointer",
                        color: "#ef4444",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                      }}
                    >
                      <Trash2 className="w-3 h-3" /> Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
