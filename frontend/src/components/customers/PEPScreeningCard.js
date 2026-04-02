import React from "react";
import { Shield, AlertTriangle } from "lucide-react";

const getPEPTierColor = (tier) => {
  if (tier === "tier1") return "#ef4444";
  if (tier === "tier2") return "#f59e0b";
  if (tier === "tier3") return "#f59e0b";
  return "#94a3b8";
};

const getPEPTierLabel = (tier) => {
  if (tier === "tier1") return "Tier 1 - High Risk";
  if (tier === "tier2") return "Tier 2 - Medium Risk";
  if (tier === "tier3") return "Tier 3 - Lower Risk";
  if (tier === "rca") return "RCA - Relative/Associate";
  return "Not PEP";
};

export const PEPScreeningCard = ({ pepScreening, screeningPEP, onRunScreening }) => (
  <div style={{
    background: "#0d1117",
    border: "1px solid #1e2530",
    borderRadius: "12px",
    padding: "24px"
  }}>
    <div className="flex items-center justify-between mb-4">
      <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9" }}>
        PEP Screening Results
      </h2>
      <button
        onClick={onRunScreening}
        disabled={screeningPEP}
        data-testid="run-pep-screening-btn"
        style={{
          background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
          color: "#ffffff",
          fontWeight: "600",
          padding: "8px 16px",
          border: "none",
          cursor: screeningPEP ? "not-allowed" : "pointer",
          fontSize: "13px"
        }}
      >
        {screeningPEP ? "Screening..." : "Run PEP Screen"}
      </button>
    </div>

    {!pepScreening ? (
      <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>
        <Shield className="w-12 h-12 mx-auto mb-4" />
        <p>No PEP screening results yet</p>
        <p style={{ fontSize: "13px", marginTop: "8px" }}>Click "Run PEP Screen" to check PEP status</p>
      </div>
    ) : pepScreening.is_pep ? (
      <div>
        <div style={{
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "20px"
        }}>
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5" style={{ color: "#ef4444" }} />
            <span style={{ color: "#ef4444", fontSize: "14px", fontWeight: "700" }}>PEP MATCH DETECTED</span>
          </div>
          <p style={{ color: "#f87171", fontSize: "13px" }}>
            This individual has been identified as a Politically Exposed Person. Enhanced due diligence required.
          </p>
        </div>

        <div style={{ background: "#080c12", border: "1px solid #1e2530", borderRadius: "8px", padding: "16px" }}>
          <div className="space-y-3">
            <div>
              <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>PEP Category</div>
              <div style={{
                display: "inline-block",
                background: `rgba(${parseInt(getPEPTierColor(pepScreening.pep_tier).slice(1, 3), 16)}, ${parseInt(getPEPTierColor(pepScreening.pep_tier).slice(3, 5), 16)}, ${parseInt(getPEPTierColor(pepScreening.pep_tier).slice(5, 7), 16)}, 0.18)`,
                color: getPEPTierColor(pepScreening.pep_tier),
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "700"
              }}>
                {getPEPTierLabel(pepScreening.pep_tier)}
              </div>
            </div>

            {pepScreening.match_details && (
              <>
                {[
                  { label: "Position Held", value: pepScreening.match_details.position },
                  { label: "Country", value: pepScreening.match_details.country },
                  { label: "Organization", value: pepScreening.match_details.organisation },
                  { label: "Status", value: pepScreening.match_details.is_former ? "Former PEP" : "Active PEP" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>{label}</div>
                    <div style={{ fontSize: "14px", color: "#f1f5f9" }}>{value}</div>
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Source</div>
                  <div style={{ fontSize: "13px", color: "#94a3b8" }}>{pepScreening.match_details.source}</div>
                </div>
              </>
            )}
            <div>
              <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Last Screened</div>
              <div style={{ fontSize: "13px", color: "#94a3b8" }}>{new Date(pepScreening.screened_at).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div style={{
        background: "rgba(16, 185, 129, 0.1)",
        border: "1px solid rgba(16, 185, 129, 0.3)",
        borderRadius: "8px",
        padding: "20px",
        textAlign: "center"
      }}>
        <div style={{ color: "#10b981", fontSize: "14px", fontWeight: "700", marginBottom: "4px" }}>NO PEP MATCH</div>
        <div style={{ color: "#94a3b8", fontSize: "13px" }}>No PEP records found for this customer</div>
        <div style={{ color: "#475569", fontSize: "12px", marginTop: "8px" }}>
          Last screened: {new Date(pepScreening.screened_at).toLocaleString()}
        </div>
      </div>
    )}
  </div>
);
