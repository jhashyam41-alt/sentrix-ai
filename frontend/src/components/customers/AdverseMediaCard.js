import React from "react";
import { AlertTriangle } from "lucide-react";

export const AdverseMediaCard = ({ adverseMedia, screeningAdverseMedia, onRunScreening, onMarkHit }) => (
  <div style={{
    background: "#0d1117",
    border: "1px solid #1e2530",
    borderRadius: "12px",
    padding: "24px",
    marginTop: "24px"
  }}>
    <div className="flex items-center justify-between mb-4">
      <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9" }}>Adverse Media Screening</h2>
      <button
        onClick={onRunScreening}
        disabled={screeningAdverseMedia}
        data-testid="run-adverse-media-btn"
        style={{
          background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
          color: "#ffffff",
          fontWeight: "600",
          padding: "8px 16px",
          border: "none",
          cursor: screeningAdverseMedia ? "not-allowed" : "pointer",
          fontSize: "13px"
        }}
      >
        {screeningAdverseMedia ? "Screening..." : "Screen News"}
      </button>
    </div>

    {!adverseMedia ? (
      <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>
        <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
        <p>No adverse media screening results yet</p>
        <p style={{ fontSize: "13px", marginTop: "8px" }}>Click "Screen News" to check for negative media coverage</p>
      </div>
    ) : adverseMedia.has_hits ? (
      <div>
        <div style={{
          background: "rgba(245, 158, 11, 0.1)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "20px"
        }}>
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5" style={{ color: "#f59e0b" }} />
            <span style={{ color: "#f59e0b", fontSize: "14px", fontWeight: "700" }}>ADVERSE MEDIA HITS FOUND</span>
          </div>
          <p style={{ color: "#fbbf24", fontSize: "13px" }}>
            {adverseMedia.hits.length} negative news {adverseMedia.hits.length === 1 ? "article" : "articles"} found. Review and mark relevance.
          </p>
        </div>

        <div className="space-y-3">
          {adverseMedia.hits.map((hit, idx) => (
            <div key={hit.id} style={{ background: "#080c12", border: "1px solid #1e2530", borderRadius: "8px", padding: "16px" }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#f1f5f9", marginBottom: "6px" }}>{hit.headline}</div>
                  <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "8px" }}>{hit.summary}</div>
                  <div className="flex items-center gap-4" style={{ fontSize: "12px", color: "#475569" }}>
                    <span>{hit.source}</span>
                    <span>&bull;</span>
                    <span>{hit.publication_date}</span>
                    <span>&bull;</span>
                    <span className="status-badge status-warning" style={{ fontSize: "10px" }}>{hit.category.replace("_", " ")}</span>
                  </div>
                </div>
                {hit.link && (
                  <a href={hit.link} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", fontSize: "12px", marginLeft: "16px" }}>
                    View Article &rarr;
                  </a>
                )}
              </div>

              <div style={{ borderTop: "1px solid #1e2530", paddingTop: "12px", marginTop: "12px" }}>
                <div style={{ fontSize: "11px", color: "#475569", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Mark Relevance</div>
                <div className="flex gap-2">
                  {[
                    { value: "relevant", label: "Relevant", activeColor: "rgba(239, 68, 68, 0.2)", activeText: "#ef4444", prefix: "\u2713" },
                    { value: "not_relevant", label: "Not Relevant", activeColor: "rgba(16, 185, 129, 0.2)", activeText: "#10b981", prefix: "\u2717" },
                    { value: "under_review", label: "Under Review", activeColor: "rgba(245, 158, 11, 0.2)", activeText: "#f59e0b", prefix: "\u29D7" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onMarkHit(hit.id, opt.value)}
                      data-testid={`mark-${opt.value.replace("_", "-")}-${idx}`}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid #1e2530",
                        background: hit.relevance === opt.value ? opt.activeColor : "#080c12",
                        color: hit.relevance === opt.value ? opt.activeText : "#94a3b8",
                        fontSize: "12px",
                        fontWeight: hit.relevance === opt.value ? "700" : "500",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      {opt.prefix} {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "16px", padding: "12px", background: "#080c12", borderRadius: "8px", fontSize: "12px", color: "#475569" }}>
          Last screened: {new Date(adverseMedia.screened_at).toLocaleString()}
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
        <div style={{ color: "#10b981", fontSize: "14px", fontWeight: "700", marginBottom: "4px" }}>NO ADVERSE MEDIA</div>
        <div style={{ color: "#94a3b8", fontSize: "13px" }}>No negative news coverage found</div>
        <div style={{ color: "#475569", fontSize: "12px", marginTop: "8px" }}>
          Last screened: {new Date(adverseMedia.screened_at).toLocaleString()}
        </div>
      </div>
    )}
  </div>
);
