import React from "react";
import { Search, Loader2 } from "lucide-react";

export function IndividualScreeningForm({
  name, setName, dob, setDob, nationality, setNationality,
  idType, setIdType, idNumber, setIdNumber,
  checks, toggleCheck, screening, onSubmit,
}) {
  return (
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

      <button onClick={onSubmit} disabled={screening || !name.trim()}
        className="btn-primary" data-testid="run-screening-btn"
        style={{ display: "flex", alignItems: "center", gap: "8px", opacity: screening ? 0.5 : 1 }}>
        {screening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        {screening ? "Screening..." : "Run Screening"}
      </button>
    </div>
  );
}
