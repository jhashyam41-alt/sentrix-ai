import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Search, Shield, AlertTriangle, FileSearch, User } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ScreeningHubPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [screeningResults, setScreeningResults] = useState(null);
  const [screening, setScreening] = useState(false);
  const navigate = useNavigate();

  const fetchCustomers = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/customers?limit=100`, {
        withCredentials: true
      });
      setCustomers(data.customers || []);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const runScreening = async (customerId) => {
    setScreening(true);
    try {
      const { data } = await axios.post(
        `${API}/screening/run/${customerId}`,
        {},
        { withCredentials: true }
      );
      setScreeningResults(data.results);
    } catch (error) {
      console.error("Screening failed:", error);
    } finally {
      setScreening(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 style={{
          fontSize: "26px",
          fontWeight: "700",
          letterSpacing: "-0.5px",
          color: "#f1f5f9",
          marginBottom: "8px"
        }} data-testid="screening-title">Screening Hub</h1>
        <p style={{ color: "#94a3b8", fontSize: "14px" }}>
          Run sanctions, PEP, and adverse media screenings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Selection */}
        <div style={{
          background: "#0d1117",
          border: "1px solid #1e2530",
          borderRadius: "12px",
          padding: "24px"
        }}>
          <h2 style={{
            fontSize: "13px",
            fontWeight: "700",
            color: "#f1f5f9",
            marginBottom: "16px"
          }}>Select Customer to Screen</h2>
          
          <div className="space-y-3">
            {loading ? (
              <p style={{ color: "#94a3b8" }}>Loading customers...</p>
            ) : customers.length === 0 ? (
              <p style={{ color: "#94a3b8" }}>No customers found</p>
            ) : (
              customers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  style={{
                    padding: "12px",
                    background: selectedCustomer?.id === customer.id ? "#1e2530" : "#080c12",
                    border: `1px solid ${selectedCustomer?.id === customer.id ? "#2563eb" : "#1e2530"}`,
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCustomer?.id !== customer.id) {
                      e.currentTarget.style.background = "#1e2530";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCustomer?.id !== customer.id) {
                      e.currentTarget.style.background = "#080c12";
                    }
                  }}
                >
                  <div style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: "500", marginBottom: "4px" }}>
                    {customer.customer_data?.full_name || customer.customer_data?.company_legal_name || "Unnamed"}
                  </div>
                  <div style={{ color: "#475569", fontSize: "12px" }}>
                    {customer.customer_type} • {customer.id}
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedCustomer && (
            <button
              onClick={() => runScreening(selectedCustomer.id)}
              disabled={screening}
              style={{
                marginTop: "16px",
                width: "100%",
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
                color: "#ffffff",
                fontWeight: "600",
                padding: "12px",
                border: "none",
                cursor: screening ? "not-allowed" : "pointer",
                fontSize: "14px"
              }}
            >
              {screening ? "Screening..." : "Run Full Screening"}
            </button>
          )}
        </div>

        {/* Screening Results */}
        <div style={{
          background: "#0d1117",
          border: "1px solid #1e2530",
          borderRadius: "12px",
          padding: "24px"
        }}>
          <h2 style={{
            fontSize: "13px",
            fontWeight: "700",
            color: "#f1f5f9",
            marginBottom: "16px"
          }}>Screening Results</h2>

          {!screeningResults ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>
              <FileSearch className="w-12 h-12 mx-auto mb-4" />
              <p>Select a customer and run screening to see results</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Sanctions */}
              <div style={{
                background: "#080c12",
                border: "1px solid #1e2530",
                borderRadius: "8px",
                padding: "16px"
              }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5" style={{ color: "#2563eb" }} />
                    <span style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: "600" }}>
                      Sanctions Screening
                    </span>
                  </div>
                  <span className={`status-badge status-${
                    screeningResults.sanctions?.status === "confirmed_match" ? "danger" :
                    screeningResults.sanctions?.status === "potential_match" ? "warning" : "success"
                  }`}>
                    {screeningResults.sanctions?.status.replace("_", " ")}
                  </span>
                </div>
                {screeningResults.sanctions?.status !== "no_match" && (
                  <div style={{ color: "#94a3b8", fontSize: "13px" }}>
                    Match detected - Review required
                  </div>
                )}
              </div>

              {/* PEP */}
              <div style={{
                background: "#080c12",
                border: "1px solid #1e2530",
                borderRadius: "8px",
                padding: "16px"
              }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5" style={{ color: "#2563eb" }} />
                    <span style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: "600" }}>
                      PEP Screening
                    </span>
                  </div>
                  <span className={`status-badge status-${
                    screeningResults.pep?.is_pep ? "warning" : "success"
                  }`}>
                    {screeningResults.pep?.is_pep ? "PEP Detected" : "No Match"}
                  </span>
                </div>
                {screeningResults.pep?.is_pep && (
                  <div style={{ color: "#94a3b8", fontSize: "13px" }}>
                    Politically Exposed Person identified
                  </div>
                )}
              </div>

              {/* Adverse Media */}
              <div style={{
                background: "#080c12",
                border: "1px solid #1e2530",
                borderRadius: "8px",
                padding: "16px"
              }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" style={{ color: "#2563eb" }} />
                    <span style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: "600" }}>
                      Adverse Media
                    </span>
                  </div>
                  <span className={`status-badge status-${
                    screeningResults.adverse_media?.has_hits ? "warning" : "success"
                  }`}>
                    {screeningResults.adverse_media?.has_hits ? "Hits Found" : "No Hits"}
                  </span>
                </div>
                {screeningResults.adverse_media?.has_hits && (
                  <div style={{ color: "#94a3b8", fontSize: "13px" }}>
                    Negative media coverage found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}