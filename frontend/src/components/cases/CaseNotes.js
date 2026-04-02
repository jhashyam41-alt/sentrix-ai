import React from "react";
import { MessageSquare, Send } from "lucide-react";

export const CaseNotes = ({ notes, isClosed, newNote, setNewNote, addingNote, onAddNote }) => (
  <div style={{
    background: "#0d1117",
    border: "1px solid #1e2530",
    borderRadius: "12px",
    padding: "24px"
  }}>
    <div className="flex items-center gap-2 mb-4">
      <MessageSquare className="w-4 h-4" style={{ color: "#2563eb" }} />
      <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9" }}>
        Internal Notes ({notes.length})
      </h2>
    </div>

    {!isClosed && (
      <div style={{ marginBottom: "20px" }}>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add an internal note..."
          data-testid="new-note-input"
          style={{
            width: "100%", background: "#080c12", border: "1px solid #1e2530",
            borderRadius: "8px", padding: "12px", color: "#f1f5f9",
            fontSize: "14px", resize: "vertical", minHeight: "80px", fontFamily: "inherit"
          }}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={onAddNote}
            disabled={addingNote || !newNote.trim()}
            data-testid="add-note-btn"
            style={{
              background: newNote.trim() ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "#1e2530",
              borderRadius: "8px",
              color: newNote.trim() ? "#ffffff" : "#475569",
              fontWeight: "600", padding: "8px 16px", border: "none",
              cursor: newNote.trim() ? "pointer" : "not-allowed",
              fontSize: "13px", display: "flex", alignItems: "center", gap: "6px"
            }}
          >
            <Send className="w-3 h-3" />
            {addingNote ? "Adding..." : "Add Note"}
          </button>
        </div>
      </div>
    )}

    {notes.length === 0 ? (
      <div style={{ textAlign: "center", padding: "30px 0", color: "#475569" }}>
        <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ opacity: 0.5 }} />
        <p style={{ fontSize: "13px" }}>No notes yet</p>
      </div>
    ) : (
      <div className="space-y-3">
        {notes.map((note) => (
          <div
            key={note.id}
            data-testid={`note-${note.id}`}
            style={{
              background: note.is_system ? "rgba(37, 99, 235, 0.08)" : "#080c12",
              border: `1px solid ${note.is_system ? "rgba(37, 99, 235, 0.2)" : "#1e2530"}`,
              borderRadius: "8px", padding: "14px"
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "13px", fontWeight: "600", color: note.is_system ? "#2563eb" : "#f1f5f9" }}>
                  {note.is_system ? "System" : note.author_name}
                </span>
                {note.author_role && !note.is_system && (
                  <span style={{
                    fontSize: "10px", color: "#475569", background: "#1e2530",
                    padding: "2px 6px", borderRadius: "4px", textTransform: "uppercase"
                  }}>
                    {note.author_role?.replace("_", " ")}
                  </span>
                )}
              </div>
              <span style={{ fontSize: "11px", color: "#475569" }}>
                {new Date(note.created_at).toLocaleString()}
              </span>
            </div>
            <p style={{ color: "#94a3b8", fontSize: "13px", lineHeight: "1.6" }}>{note.note}</p>
          </div>
        ))}
      </div>
    )}
  </div>
);
