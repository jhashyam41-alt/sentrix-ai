import React, { useState, useEffect } from "react";
import { CheckCircle, Loader2 } from "lucide-react";

const STEPS = [
  { key: "kyc", label: "Verifying Identity...", doneLabel: "Identity Verified" },
  { key: "sanctions", label: "Checking Sanctions Lists...", doneLabel: "Sanctions Check Complete" },
  { key: "pep", label: "Screening PEP Database...", doneLabel: "PEP Screening Complete" },
  { key: "adverse_media", label: "Scanning Adverse Media...", doneLabel: "Media Scan Complete" },
  { key: "risk", label: "Calculating Risk Score...", doneLabel: "Risk Score Calculated" },
];

export function ScreeningProgress({ checks, isRunning, isComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);

  // Filter steps based on selected checks (risk always included)
  const activeSteps = STEPS.filter(
    (s) => s.key === "risk" || checks.includes(s.key)
  );

  useEffect(() => {
    if (!isRunning) {
      if (isComplete) {
        setCompletedSteps(activeSteps.map((_, i) => i));
        setCurrentStep(activeSteps.length);
      }
      return;
    }

    setCurrentStep(0);
    setCompletedSteps([]);

    const interval = 600;
    const timers = activeSteps.map((_, i) =>
      setTimeout(() => {
        setCompletedSteps((prev) => [...prev, i]);
        setCurrentStep(i + 1);
      }, interval * (i + 1))
    );

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, isComplete]);

  if (!isRunning && !isComplete) return null;

  return (
    <div style={{
      background: "#0d1117", border: "1px solid #1e2530", borderRadius: "10px",
      padding: "20px", marginBottom: "24px",
    }} data-testid="screening-progress">
      <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: "#475569", marginBottom: "16px" }}>
        Screening Progress
      </div>
      <div className="space-y-3">
        {activeSteps.map((step, i) => {
          const done = completedSteps.includes(i);
          const active = currentStep === i && isRunning;
          const ss = stepStyle(done, active);
          return (
            <div key={step.key} className="flex items-center gap-3"
              data-testid={`progress-step-${step.key}`}
              style={{
                opacity: done || active ? 1 : 0.35,
                transition: "opacity 0.4s ease",
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: "50%", display: "flex",
                alignItems: "center", justifyContent: "center",
                background: ss.bg,
                transition: "background 0.3s",
              }}>
                {done ? (
                  <CheckCircle style={{ width: 16, height: 16, color: "#10b981" }} />
                ) : active ? (
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#2563eb" }} />
                ) : (
                  <span style={{ fontSize: 11, color: "#475569", fontWeight: 700 }}>{i + 1}</span>
                )}
              </div>
              <span style={{
                fontSize: "13px", fontWeight: ss.fontWeight,
                color: ss.color,
                transition: "color 0.3s",
              }}>
                {done ? step.doneLabel : step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
