import React from "react";
import { X, Loader2, Search } from "lucide-react";

const COUNTRIES = [
  { code: "IN", name: "India" }, { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" }, { code: "AE", name: "UAE" },
  { code: "SG", name: "Singapore" }, { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" }, { code: "DE", name: "Germany" },
  { code: "JP", name: "Japan" }, { code: "FR", name: "France" },
  { code: "CN", name: "China" }, { code: "RU", name: "Russia" },
  { code: "BR", name: "Brazil" }, { code: "ZA", name: "South Africa" },
  { code: "NG", name: "Nigeria" }, { code: "KE", name: "Kenya" },
  { code: "PK", name: "Pakistan" }, { code: "BD", name: "Bangladesh" },
  { code: "LK", name: "Sri Lanka" }, { code: "NP", name: "Nepal" },
  { code: "MY", name: "Malaysia" }, { code: "ID", name: "Indonesia" },
  { code: "TH", name: "Thailand" }, { code: "VN", name: "Vietnam" },
  { code: "PH", name: "Philippines" }, { code: "SA", name: "Saudi Arabia" },
  { code: "QA", name: "Qatar" }, { code: "KW", name: "Kuwait" },
  { code: "BH", name: "Bahrain" }, { code: "OM", name: "Oman" },
  { code: "IR", name: "Iran" }, { code: "AF", name: "Afghanistan" },
  { code: "KP", name: "North Korea" }, { code: "MM", name: "Myanmar" },
  { code: "SY", name: "Syria" }, { code: "YE", name: "Yemen" },
];

const ID_TYPES = [
  { value: "", label: "Select ID Type" },
  { value: "PAN", label: "PAN Card" },
  { value: "AADHAAR", label: "Aadhaar Card" },
  { value: "PASSPORT", label: "Passport" },
  { value: "VOTER_ID", label: "Voter ID" },
  { value: "DL", label: "Driving License" },
];

const CHECK_OPTIONS = [
  { key: "kyc", label: "KYC Verification" },
  { key: "sanctions", label: "Sanctions" },
  { key: "pep", label: "PEP" },
  { key: "adverse_media", label: "Adverse Media" },
];

export function NewScreeningForm({ form, setForm, onSubmit, onClose, submitting }) {
  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const toggleCheck = (key) => {
    setForm((prev) => {
      const checks = prev.checks.includes(key)
        ? prev.checks.filter((c) => c !== key)
        : [...prev.checks, key];
      return { ...prev, checks };
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      paddingTop: "60px", overflowY: "auto",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "#0d1117", border: "1px solid #1e2530", borderRadius: "14px",
        width: "100%", maxWidth: "560px", padding: "28px",
        animation: "slideDown 0.25s ease-out",
      }} data-testid="new-screening-modal">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#f1f5f9" }}>New Screening</h2>
          <button onClick={onClose} data-testid="close-screening-modal"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#475569", padding: "4px" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label style={labelStyle}>Full Name *</label>
            <input type="text" value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)}
              placeholder="e.g., Aarav Sharma" className="input-aml w-full" data-testid="screening-fullname"
              autoFocus />
          </div>

          {/* DOB + Nationality */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Date of Birth</label>
              <input type="date" value={form.dateOfBirth} onChange={(e) => updateField("dateOfBirth", e.target.value)}
                className="input-aml w-full" data-testid="screening-dob" style={{ colorScheme: "dark" }} />
            </div>
            <div>
              <label style={labelStyle}>Nationality</label>
              <select value={form.nationality} onChange={(e) => updateField("nationality", e.target.value)}
                className="input-aml w-full" data-testid="screening-nationality" style={{ colorScheme: "dark" }}>
                <option value="">Select Country</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ID Type + Number */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>ID Type</label>
              <select value={form.idType} onChange={(e) => updateField("idType", e.target.value)}
                className="input-aml w-full" data-testid="screening-idtype" style={{ colorScheme: "dark" }}>
                {ID_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>ID Number</label>
              <input type="text" value={form.idNumber} onChange={(e) => updateField("idNumber", e.target.value)}
                placeholder={form.idType === "PAN" ? "ABCDE1234F" : form.idType === "AADHAAR" ? "123456789012" : "Enter number"}
                className="input-aml w-full" data-testid="screening-idnumber"
                disabled={!form.idType} style={{ opacity: form.idType ? 1 : 0.4 }} />
            </div>
          </div>

          {/* Checks */}
          <div>
            <label style={labelStyle}>Checks to Run</label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              {CHECK_OPTIONS.map((opt) => {
                const active = form.checks.includes(opt.key);
                const disabled = opt.key === "kyc" && !form.idType;
                return (
                  <label key={opt.key} data-testid={`check-toggle-${opt.key}`}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "10px 14px", borderRadius: "8px", cursor: disabled ? "not-allowed" : "pointer",
                      border: active ? "1px solid #2563eb" : "1px solid #1e2530",
                      background: active ? "rgba(37,99,235,0.08)" : "#080c12",
                      opacity: disabled ? 0.35 : 1,
                      transition: "all 0.15s",
                    }}>
                    <input type="checkbox" checked={active} disabled={disabled}
                      onChange={() => !disabled && toggleCheck(opt.key)}
                      style={{ accentColor: "#2563eb", width: 16, height: 16 }} />
                    <span style={{ fontSize: "13px", color: active ? "#60a5fa" : "#94a3b8", fontWeight: 500 }}>
                      {opt.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button onClick={onSubmit} disabled={submitting || !form.fullName.trim() || form.checks.length === 0}
            className="btn-primary flex-1" data-testid="submit-screening"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              opacity: submitting || !form.fullName.trim() || form.checks.length === 0 ? 0.5 : 1,
              padding: "12px",
            }}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {submitting ? "Running Screening..." : "Run Screening"}
          </button>
          <button onClick={onClose}
            style={{
              background: "transparent", border: "1px solid #1e2530", borderRadius: "8px",
              padding: "12px 20px", color: "#94a3b8", cursor: "pointer", fontSize: "13px",
            }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  fontSize: "12px", color: "#94a3b8", marginBottom: "6px", display: "block", fontWeight: 500,
};
