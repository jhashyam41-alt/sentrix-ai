import React from "react";
import { Loader2, ShieldCheck } from "lucide-react";

const DOC_TYPES = [
  { key: "pan", label: "PAN Card", field: "panNumber", placeholder: "ABCDE1234F" },
  { key: "aadhaar", label: "Aadhaar", field: "aadhaarNumber", placeholder: "123456789012" },
  { key: "passport", label: "Passport", field: "passportNumber", placeholder: "A1234567" },
  { key: "voter_id", label: "Voter ID", field: "voterIdNumber", placeholder: "ABC1234567" },
  { key: "driving_license", label: "Driving License", field: "dlNumber", placeholder: "KA0120201234567" },
];

export function KYCDocForm({ selectedDoc, setSelectedDoc, idNumber, setIdNumber, verifying, onVerify }) {
  const currentDoc = DOC_TYPES.find((d) => d.key === selectedDoc);

  return (
    <div style={{
      background: "#080c12",
      border: "1px solid #1e2530",
      borderRadius: "8px",
      padding: "16px",
      marginBottom: "16px",
    }}>
      <div className="flex gap-3 mb-3 flex-wrap">
        {DOC_TYPES.map((doc) => (
          <button
            key={doc.key}
            onClick={() => { setSelectedDoc(doc.key); }}
            data-testid={`kyc-tab-${doc.key}`}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              border: selectedDoc === doc.key ? "1px solid #2563eb" : "1px solid #1e2530",
              background: selectedDoc === doc.key ? "rgba(37,99,235,0.15)" : "transparent",
              color: selectedDoc === doc.key ? "#60a5fa" : "#94a3b8",
              transition: "all 0.2s",
            }}
          >
            {doc.label}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          value={idNumber}
          onChange={(e) => setIdNumber(e.target.value)}
          placeholder={currentDoc?.placeholder || ""}
          data-testid="kyc-id-input"
          className="input-aml flex-1"
          style={{ fontSize: "14px" }}
          onKeyDown={(e) => e.key === "Enter" && onVerify()}
        />
        <button
          onClick={onVerify}
          disabled={verifying || !idNumber.trim()}
          data-testid="kyc-verify-btn"
          className="btn-primary"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            opacity: verifying || !idNumber.trim() ? 0.5 : 1,
            minWidth: "100px",
            justifyContent: "center",
          }}
        >
          {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {verifying ? "Verifying..." : "Verify"}
        </button>
      </div>
    </div>
  );
}

export { DOC_TYPES };
