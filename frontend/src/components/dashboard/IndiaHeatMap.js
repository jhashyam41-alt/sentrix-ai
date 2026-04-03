import React from "react";

const CITIES = [
  { name: "Delhi", x: 48, y: 18, screenings: 42 },
  { name: "Mumbai", x: 27, y: 52, screenings: 58 },
  { name: "Bangalore", x: 38, y: 78, screenings: 35 },
  { name: "Chennai", x: 53, y: 78, screenings: 28 },
  { name: "Kolkata", x: 72, y: 42, screenings: 22 },
  { name: "Hyderabad", x: 44, y: 62, screenings: 31 },
  { name: "Pune", x: 30, y: 58, screenings: 19 },
  { name: "Jaipur", x: 38, y: 24, screenings: 15 },
  { name: "Lucknow", x: 55, y: 27, screenings: 12 },
  { name: "Ahmedabad", x: 22, y: 38, screenings: 18 },
];

function sizeForCount(count) {
  if (count >= 40) return 14;
  if (count >= 25) return 11;
  if (count >= 15) return 8;
  return 6;
}

function colorForCount(count) {
  if (count >= 40) return "#ef4444";
  if (count >= 25) return "#f59e0b";
  return "#2563eb";
}

export function IndiaHeatMap() {
  return (
    <div data-testid="india-heat-map" style={{ position: "relative", width: "100%", height: "260px", overflow: "hidden" }}>
      {/* Grid background */}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.1 }}>
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#2563eb" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* India outline approximation */}
      <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <path
          d="M45,5 L55,5 L60,10 L65,12 L72,15 L78,20 L80,28 L82,35 L80,42 L78,48 L72,50 L70,55 L68,60 L62,65 L58,72 L55,80 L52,85 L48,90 L45,92 L42,88 L38,82 L35,75 L32,68 L28,62 L25,55 L22,48 L20,42 L18,35 L20,28 L22,22 L28,15 L35,10 L40,7 Z"
          fill="none"
          stroke="#2563eb"
          strokeWidth="0.5"
          opacity="0.25"
        />
      </svg>

      {/* City dots */}
      {CITIES.map((city, idx) => {
        const size = sizeForCount(city.screenings);
        const color = colorForCount(city.screenings);
        return (
          <div key={city.name} style={{
            position: "absolute",
            left: `${city.x}%`, top: `${city.y}%`,
            transform: "translate(-50%, -50%)",
            display: "flex", flexDirection: "column", alignItems: "center",
            animation: `mapDotPulse 2s ease-in-out ${idx * 0.2}s infinite`,
          }}>
            <div style={{
              width: `${size}px`, height: `${size}px`, borderRadius: "50%",
              background: color, boxShadow: `0 0 ${size}px ${color}60`,
            }} />
            <span style={{
              fontSize: "8px", color: "#94a3b8", marginTop: "3px",
              whiteSpace: "nowrap", fontWeight: "600", letterSpacing: "0.5px",
            }}>
              {city.name}
            </span>
          </div>
        );
      })}

      {/* Legend */}
      <div style={{
        position: "absolute", bottom: "8px", right: "8px",
        display: "flex", gap: "10px", alignItems: "center",
      }}>
        {[
          { label: "High", color: "#ef4444" },
          { label: "Med", color: "#f59e0b" },
          { label: "Low", color: "#2563eb" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1">
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: l.color }} />
            <span style={{ fontSize: "8px", color: "#475569" }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
