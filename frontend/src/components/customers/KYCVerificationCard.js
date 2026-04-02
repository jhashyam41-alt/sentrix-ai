import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import logger from "../../utils/logger";
import { ShieldCheck } from "lucide-react";
import { KYCDocForm, DOC_TYPES } from "./KYCDocForm";
import { KYCResultBanner, KYCVerificationHistory } from "./KYCResultDisplay";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function KYCVerificationCard({ customerId, customerName }) {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState("pan");
  const [idNumber, setIdNumber] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const fetchVerifications = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/kyc/verifications/${customerId}`, {
        withCredentials: true,
      });
      setVerifications(data.verifications || []);
    } catch (err) {
      logger.error("Failed to fetch KYC verifications:", err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  const runVerification = async () => {
    const docType = DOC_TYPES.find((d) => d.key === selectedDoc);
    if (!docType || !idNumber.trim()) return;

    setVerifying(true);
    setLastResult(null);
    try {
      const payload = { [docType.field]: idNumber.trim(), customerId };
      if (selectedDoc === "pan") payload.fullName = customerName || "";

      let endpoint = `verify-${selectedDoc}`;
      if (selectedDoc === "driving_license") endpoint = "verify-driving-license";
      if (selectedDoc === "voter_id") endpoint = "verify-voter-id";

      const { data } = await axios.post(`${API}/kyc/${endpoint}`, payload, {
        withCredentials: true,
      });
      setLastResult(data);
      setIdNumber("");
      await fetchVerifications();
    } catch (err) {
      const msg = err.response?.data?.detail || "Verification failed";
      setLastResult({ status: "error", message: msg });
    } finally {
      setVerifying(false);
    }
  };

  const handleDocChange = (key) => {
    setSelectedDoc(key);
    setIdNumber("");
    setLastResult(null);
  };

  return (
    <div style={{
      background: "#0d1117",
      border: "1px solid #1e2530",
      borderRadius: "12px",
      padding: "24px",
      marginBottom: "24px",
    }} data-testid="kyc-verification-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck style={{ color: "#2563eb", width: 18, height: 18 }} />
          <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9" }}>
            KYC Document Verification
          </h2>
        </div>
        <span style={{
          fontSize: "10px",
          padding: "4px 8px",
          borderRadius: "4px",
          background: "rgba(37,99,235,0.15)",
          color: "#60a5fa",
          fontWeight: 600,
        }}>
          DEMO MODE
        </span>
      </div>

      <KYCDocForm
        selectedDoc={selectedDoc}
        setSelectedDoc={handleDocChange}
        idNumber={idNumber}
        setIdNumber={setIdNumber}
        verifying={verifying}
        onVerify={runVerification}
      />

      <KYCResultBanner result={lastResult} />

      <KYCVerificationHistory verifications={verifications} loading={loading} />
    </div>
  );
}
