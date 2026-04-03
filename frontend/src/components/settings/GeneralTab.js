import React, { useState } from "react";
import axios from "axios";
import logger from "../../utils/logger";
import { Save, Upload } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TIMEZONES = [
  "Asia/Kolkata", "America/New_York", "America/Chicago", "America/Los_Angeles",
  "Europe/London", "Europe/Berlin", "Europe/Paris", "Asia/Singapore",
  "Asia/Tokyo", "Asia/Dubai", "Australia/Sydney", "Pacific/Auckland",
];

const CURRENCIES = [
  { code: "INR", label: "Indian Rupee (INR)" },
  { code: "USD", label: "US Dollar (USD)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "GBP", label: "British Pound (GBP)" },
  { code: "SGD", label: "Singapore Dollar (SGD)" },
  { code: "AED", label: "UAE Dirham (AED)" },
];

const inputStyle = {
  width: "100%", background: "#080c12", border: "1px solid #1e2530",
  borderRadius: "8px", padding: "10px 14px", color: "#f1f5f9", fontSize: "13px",
};

export function GeneralTab({ settings, onRefresh }) {
  const general = settings?.general || {};
  const [form, setForm] = useState({
    company_name: general.company_name || "",
    timezone: general.timezone || "Asia/Kolkata",
    currency: general.currency || "INR",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings/general`, form, { withCredentials: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onRefresh();
    } catch (err) {
      logger.error("Failed to save general settings:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: "#0d1117", border: "1px solid #1e2530", borderRadius: "12px", padding: "28px" }}>
      <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#f1f5f9", marginBottom: "20px" }}>General Settings</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label style={{ fontSize: "11px", fontWeight: "600", color: "#475569", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "6px" }}>
            Company Name
          </label>
          <input
            value={form.company_name}
            onChange={(e) => setForm(p => ({ ...p, company_name: e.target.value }))}
            data-testid="input-company-name"
            style={inputStyle}
            placeholder="Your company name"
          />
        </div>

        <div>
          <label style={{ fontSize: "11px", fontWeight: "600", color: "#475569", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "6px" }}>
            Company Logo
          </label>
          <div
            data-testid="logo-upload-area"
            style={{
              ...inputStyle, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              cursor: "pointer", color: "#475569", borderStyle: "dashed", padding: "10px 14px",
            }}
          >
            <Upload style={{ width: "14px", height: "14px" }} />
            <span style={{ fontSize: "12px" }}>Click to upload logo</span>
          </div>
        </div>

        <div>
          <label style={{ fontSize: "11px", fontWeight: "600", color: "#475569", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "6px" }}>
            Timezone
          </label>
          <select
            value={form.timezone}
            onChange={(e) => setForm(p => ({ ...p, timezone: e.target.value }))}
            data-testid="select-timezone"
            style={inputStyle}
          >
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: "11px", fontWeight: "600", color: "#475569", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "6px" }}>
            Default Currency
          </label>
          <select
            value={form.currency}
            onChange={(e) => setForm(p => ({ ...p, currency: e.target.value }))}
            data-testid="select-currency"
            style={inputStyle}
          >
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          data-testid="save-general-btn"
          style={{
            background: saved ? "rgba(16, 185, 129, 0.15)" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
            border: saved ? "1px solid rgba(16, 185, 129, 0.4)" : "none",
            borderRadius: "8px", padding: "10px 20px",
            color: saved ? "#10b981" : "#fff", fontSize: "13px", fontWeight: "600",
            cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
          }}
        >
          <Save style={{ width: "14px", height: "14px" }} />
          {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
