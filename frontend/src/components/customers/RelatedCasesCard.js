import React from "react";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";

export const RelatedCasesCard = ({ cases }) => {
  const navigate = useNavigate();

  return (
    <div style={{
      background: "#0d1117",
      border: "1px solid #1e2530",
      borderRadius: "12px",
      padding: "24px",
      marginTop: "24px"
    }}>
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9" }}>
          Related Cases ({cases?.length || 0})
        </h2>
        <button
          onClick={() => navigate("/cases")}
          data-testid="view-all-cases-btn"
          style={{
            background: "transparent",
            border: "1px solid #1e2530",
            borderRadius: "6px",
            padding: "6px 12px",
            color: "#94a3b8",
            fontSize: "12px",
            cursor: "pointer"
          }}
        >
          View All Cases
        </button>
      </div>

      {!cases || cases.length === 0 ? (
        <div style={{ textAlign: "center", padding: "30px 0", color: "#475569" }}>
          <FileText className="w-8 h-8 mx-auto mb-2" style={{ opacity: 0.5 }} />
          <p style={{ fontSize: "13px" }}>No cases for this customer</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cases.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/cases/${c.id}`)}
              data-testid={`customer-case-${c.id}`}
              style={{
                background: "#080c12",
                border: "1px solid #1e2530",
                borderRadius: "8px",
                padding: "12px 16px",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2563eb"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1e2530"; }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span style={{ color: "#2563eb", fontSize: "13px", fontWeight: "600" }}>{c.case_id}</span>
                  <span style={{ color: "#475569", fontSize: "12px", marginLeft: "8px" }}>
                    {c.case_type?.replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{
                    background: c.priority === "critical" || c.priority === "high" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                    color: c.priority === "critical" || c.priority === "high" ? "#ef4444" : "#f59e0b",
                    padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: "700", textTransform: "uppercase"
                  }}>
                    {c.priority}
                  </span>
                  <span style={{
                    background: c.status === "closed" ? "rgba(16, 185, 129, 0.15)" : "rgba(37, 99, 235, 0.15)",
                    color: c.status === "closed" ? "#10b981" : "#2563eb",
                    padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: "700", textTransform: "uppercase"
                  }}>
                    {c.status?.replace("_", " ")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
