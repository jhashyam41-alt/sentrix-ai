import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { User, AlertTriangle, FileWarning, Shield, Zap } from "lucide-react";

const caseTypeConfig = {
  pep_match: { label: "PEP Match", color: "#f59e0b", icon: Shield },
  sanctions_match: { label: "Sanctions", color: "#ef4444", icon: AlertTriangle },
  adverse_media: { label: "Adverse Media", color: "#a855f7", icon: FileWarning },
  suspicious_transaction: { label: "Suspicious Txn", color: "#f97316", icon: Zap },
};

const priorityConfig = {
  critical: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" },
  high: { color: "#f97316", bg: "rgba(249, 115, 22, 0.15)" },
  medium: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" },
  low: { color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" },
};

function getUrgencyColor(createdAt) {
  const days = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (days > 7) return "#ef4444";
  if (days > 3) return "#f59e0b";
  return "#10b981";
}

export function CaseCard({ caseData, onClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: caseData.id,
    data: { caseData },
  });

  const typeConf = caseTypeConfig[caseData.case_type] || caseTypeConfig.adverse_media;
  const prioConf = priorityConfig[caseData.priority] || priorityConfig.medium;
  const TypeIcon = typeConf.icon;
  const urgencyColor = getUrgencyColor(caseData.created_at);

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.4 : 1 }
    : {};

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-testid={`case-card-${caseData.case_id}`}
      onClick={(e) => { e.stopPropagation(); onClick(caseData); }}
      style={{
        background: "#0d1117",
        border: "1px solid #1e2530",
        borderRadius: "10px",
        padding: "14px",
        cursor: "grab",
        transition: "border-color 0.2s, box-shadow 0.2s",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#2563eb";
        e.currentTarget.style.boxShadow = "0 0 0 1px rgba(37, 99, 235, 0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#1e2530";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontSize: "12px", fontWeight: "700", color: "#2563eb" }}>{caseData.case_id}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {caseData.sar_filed && (
            <span style={{ fontSize: "9px", fontWeight: "700", color: "#ef4444", background: "rgba(239,68,68,0.15)", padding: "2px 5px", borderRadius: "3px" }}>SAR</span>
          )}
          <div
            data-testid={`urgency-dot-${caseData.case_id}`}
            title={`Open ${Math.floor((Date.now() - new Date(caseData.created_at).getTime()) / 86400000)}d`}
            style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: urgencyColor,
              boxShadow: `0 0 6px ${urgencyColor}`,
            }}
          />
        </div>
      </div>

      <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9", marginBottom: "8px", lineHeight: "1.3" }}>
        {caseData.customer_name}
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        <TypeIcon style={{ width: "12px", height: "12px", color: typeConf.color }} />
        <span style={{ fontSize: "11px", fontWeight: "600", color: typeConf.color }}>{typeConf.label}</span>
      </div>

      <div className="flex items-center justify-between">
        <span style={{
          fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px",
          color: prioConf.color, background: prioConf.bg,
          padding: "3px 7px", borderRadius: "4px",
        }}>
          {caseData.priority}
        </span>
        {caseData.assigned_to && (
          <div className="flex items-center gap-1" style={{ color: "#94a3b8" }}>
            <User style={{ width: "11px", height: "11px" }} />
            <span style={{ fontSize: "11px" }}>{caseData.assigned_to.split(" ")[0]}</span>
          </div>
        )}
      </div>
    </div>
  );
}
