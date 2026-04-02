import React from "react";

const EDD_ITEMS = [
  { key: "enhanced_sof_evidence", label: "Enhanced Source of Funds Evidence Collected" },
  { key: "enhanced_sow_evidence", label: "Enhanced Source of Wealth Evidence Collected" },
  { key: "senior_approval", label: "Senior Management Approval Obtained" },
  { key: "site_visit_conducted", label: "Site Visit or Video Call Conducted" },
  { key: "monitoring_frequency_set", label: "Ongoing Monitoring Frequency Set" },
  { key: "edd_report_signed_off", label: "EDD Report Drafted and Signed Off" },
];

export const CDDManagementCard = ({ customer, eddChecklist, updatingCDD, onUpdateCDDStatus, onToggleEDDItem }) => (
  <div style={{
    background: "#0d1117",
    border: "1px solid #1e2530",
    borderRadius: "12px",
    padding: "24px",
    marginTop: "24px"
  }}>
    <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9", marginBottom: "16px" }}>
      CDD/EDD Management
    </h2>

    {/* CDD Tier Info */}
    <div style={{ background: "#080c12", border: "1px solid #1e2530", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div style={{ fontSize: "11px", color: "#475569", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>
            CDD Tier (Auto-Assigned)
          </div>
          <div style={{
            fontSize: "16px",
            fontWeight: "700",
            color: customer.cdd_tier === "edd" ? "#ef4444" : customer.cdd_tier === "standard_cdd" ? "#f59e0b" : "#10b981",
            textTransform: "uppercase"
          }}>
            {customer.cdd_tier === "sdd" && "SDD - Simplified"}
            {customer.cdd_tier === "standard_cdd" && "Standard CDD"}
            {customer.cdd_tier === "edd" && "EDD - Enhanced"}
          </div>
          <div style={{ fontSize: "11px", color: "#475569", marginTop: "4px" }}>
            Based on risk score: {customer.risk_score}/100
          </div>
        </div>

        <div>
          <div style={{ fontSize: "11px", color: "#475569", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>CDD Status</div>
          <span className={`status-badge status-${
            customer.cdd_status === "complete" || customer.cdd_status === "edd_complete" ? "success" :
            customer.cdd_status === "expired" || customer.cdd_status === "requires_edd" ? "danger" : "warning"
          }`} style={{ fontSize: "12px" }}>
            {customer.cdd_status?.replace("_", " ").toUpperCase()}
          </span>
        </div>
      </div>

      {customer.cdd_review_date && (
        <div className="grid grid-cols-2 gap-4 mt-4" style={{ paddingTop: "16px", borderTop: "1px solid #1e2530" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px" }}>Review Date</div>
            <div style={{ fontSize: "13px", color: "#94a3b8" }}>{new Date(customer.cdd_review_date).toLocaleDateString()}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px" }}>Expiry Date</div>
            <div style={{
              fontSize: "13px",
              color: customer.cdd_status === "expired" ? "#ef4444" : "#94a3b8",
              fontWeight: customer.cdd_status === "expired" ? "700" : "normal"
            }}>
              {customer.cdd_expiry_date ? new Date(customer.cdd_expiry_date).toLocaleDateString() : "Not set"}
              {customer.cdd_status === "expired" && " (EXPIRED)"}
            </div>
          </div>
        </div>
      )}
    </div>

    {/* CDD Status Actions */}
    <div style={{ marginBottom: "16px" }}>
      <div style={{ fontSize: "11px", color: "#475569", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
        Update CDD Status
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          { status: "in_progress", label: "In Progress", activeColor: "#2563eb", show: true },
          { status: "complete", label: "Complete", activeColor: "#10b981", show: customer.cdd_tier !== "edd" },
          { status: "edd_in_progress", label: "EDD In Progress", activeColor: "#f59e0b", show: customer.cdd_tier === "edd" },
        ].filter(b => b.show).map((btn) => (
          <button
            key={btn.status}
            onClick={() => onUpdateCDDStatus(btn.status)}
            disabled={updatingCDD}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #1e2530",
              background: customer.cdd_status === btn.status ? btn.activeColor : "#080c12",
              color: customer.cdd_status === btn.status ? "#ffffff" : "#94a3b8",
              fontSize: "12px",
              fontWeight: customer.cdd_status === btn.status ? "700" : "500",
              cursor: updatingCDD ? "not-allowed" : "pointer"
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>

    {/* EDD Checklist */}
    {customer.cdd_tier === "edd" && (
      <div style={{ background: "#080c12", border: "1px solid #1e2530", borderRadius: "8px", padding: "16px" }}>
        <div style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9", marginBottom: "12px" }}>
          EDD Checklist - Required Sign-Offs
        </div>
        <div className="space-y-3">
          {EDD_ITEMS.map((item, idx) => {
            const isChecked = eddChecklist?.[item.key] || false;
            return (
              <div
                key={item.key}
                onClick={() => onToggleEDDItem(item.key)}
                data-testid={`edd-checklist-${idx}`}
                style={{
                  padding: "10px 12px",
                  background: isChecked ? "rgba(16, 185, 129, 0.1)" : "#0d1117",
                  border: `1px solid ${isChecked ? "#10b981" : "#1e2530"}`,
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => { if (!isChecked) e.currentTarget.style.background = "#1e2530"; }}
                onMouseLeave={(e) => { if (!isChecked) e.currentTarget.style.background = "#0d1117"; }}
              >
                <div className="flex items-center gap-3">
                  <div style={{
                    width: "20px", height: "20px", borderRadius: "4px",
                    border: `2px solid ${isChecked ? "#10b981" : "#475569"}`,
                    background: isChecked ? "#10b981" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "14px", color: "#ffffff", fontWeight: "700"
                  }}>
                    {isChecked && "\u2713"}
                  </div>
                  <span style={{
                    fontSize: "13px",
                    color: isChecked ? "#10b981" : "#f1f5f9",
                    fontWeight: isChecked ? "600" : "400"
                  }}>
                    {item.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {eddChecklist && Object.values(eddChecklist).every(v => v === true) && (
          <div style={{
            marginTop: "12px", padding: "12px",
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: "6px", textAlign: "center"
          }}>
            <div style={{ color: "#10b981", fontSize: "13px", fontWeight: "700" }}>All EDD Requirements Complete</div>
            <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>Status automatically updated to EDD Complete</div>
          </div>
        )}
      </div>
    )}
  </div>
);
