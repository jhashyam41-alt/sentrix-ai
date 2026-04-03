import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { CaseCard } from "./CaseCard";

const columnConfig = {
  open: { label: "New Alerts", color: "#2563eb", bgAccent: "rgba(37, 99, 235, 0.08)" },
  in_progress: { label: "Under Investigation", color: "#f59e0b", bgAccent: "rgba(245, 158, 11, 0.08)" },
  escalated: { label: "Escalated", color: "#ef4444", bgAccent: "rgba(239, 68, 68, 0.08)" },
  closed: { label: "Resolved", color: "#10b981", bgAccent: "rgba(16, 185, 129, 0.08)" },
};

export function KanbanColumn({ status, cases, onCardClick }) {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  const config = columnConfig[status] || columnConfig.open;

  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-column-${status}`}
      style={{
        flex: 1,
        minWidth: "280px",
        background: isOver ? config.bgAccent : "transparent",
        border: `1px solid ${isOver ? config.color : "#1e2530"}`,
        borderRadius: "12px",
        transition: "all 0.2s ease",
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 240px)",
      }}
    >
      <div style={{
        padding: "14px 16px",
        borderBottom: "1px solid #1e2530",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div className="flex items-center gap-2">
          <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: config.color }} />
          <span style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9" }}>{config.label}</span>
        </div>
        <span style={{
          fontSize: "12px", fontWeight: "700", color: config.color,
          background: config.bgAccent, padding: "2px 8px", borderRadius: "10px",
          minWidth: "24px", textAlign: "center",
        }}>
          {cases.length}
        </span>
      </div>

      <div style={{
        padding: "12px",
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}>
        {cases.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "30px 10px", color: "#475569", fontSize: "12px",
            border: "1px dashed #1e2530", borderRadius: "8px",
          }}>
            Drop cases here
          </div>
        ) : (
          cases.map((c) => <CaseCard key={c.id} caseData={c} onClick={onCardClick} />)
        )}
      </div>
    </div>
  );
}
