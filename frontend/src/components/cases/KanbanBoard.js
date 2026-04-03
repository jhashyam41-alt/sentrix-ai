import React, { useMemo } from "react";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import { CaseCard } from "./CaseCard";

const COLUMNS = ["open", "in_progress", "escalated", "closed"];

export function KanbanBoard({ cases, onStatusChange, onCardClick, activeDragId, setActiveDragId }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const grouped = useMemo(() => {
    const groups = { open: [], in_progress: [], escalated: [], closed: [] };
    cases.forEach((c) => {
      const bucket = groups[c.status] !== undefined ? c.status : "open";
      groups[bucket].push(c);
    });
    const prioOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    Object.values(groups).forEach((arr) =>
      arr.sort((a, b) => (prioOrder[a.priority] ?? 2) - (prioOrder[b.priority] ?? 2))
    );
    return groups;
  }, [cases]);

  const activeCase = activeDragId ? cases.find((c) => c.id === activeDragId) : null;

  const handleDragStart = (event) => setActiveDragId(event.active.id);

  const handleDragEnd = (event) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const caseData = active.data.current?.caseData;
    if (!caseData) return;

    const newStatus = over.id;
    if (COLUMNS.includes(newStatus) && newStatus !== caseData.status) {
      onStatusChange(caseData, newStatus);
    }
  };

  const handleDragCancel = () => setActiveDragId(null);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        data-testid="kanban-board"
        style={{
          display: "flex",
          gap: "16px",
          overflowX: "auto",
          paddingBottom: "8px",
        }}
      >
        {COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            cases={grouped[status]}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeCase ? (
          <div style={{ opacity: 0.9, transform: "rotate(3deg)" }}>
            <CaseCard caseData={activeCase} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
