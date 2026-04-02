import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, User, Shield, AlertTriangle, Calendar } from "lucide-react";
import { PEPScreeningCard } from "../components/customers/PEPScreeningCard";
import { AdverseMediaCard } from "../components/customers/AdverseMediaCard";
import { CDDManagementCard } from "../components/customers/CDDManagementCard";
import { RelatedCasesCard } from "../components/customers/RelatedCasesCard";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Helper function for PEP tier colors (used in header badge)
const getPEPTierColor = (tier) => {
  if (tier === "tier1") return "#ef4444";
  if (tier === "tier2") return "#f59e0b";
  if (tier === "tier3") return "#f59e0b";
  return "#94a3b8";
};

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pepScreening, setPepScreening] = useState(null);
  const [adverseMedia, setAdverseMedia] = useState(null);
  const [screeningPEP, setScreeningPEP] = useState(false);
  const [screeningAdverseMedia, setScreeningAdverseMedia] = useState(false);
  const [eddChecklist, setEddChecklist] = useState(null);
  const [updatingCDD, setUpdatingCDD] = useState(false);

  const fetchCustomer = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/customers/${id}`, {
        withCredentials: true
      });
      setCustomer(data);
      
      if (data.pep_screening) {
        setPepScreening(data.pep_screening);
      }
      
      if (data.adverse_media_screening) {
        setAdverseMedia(data.adverse_media_screening);
      }
      
      if (data.edd_checklist) {
        setEddChecklist(data.edd_checklist);
      }
    } catch (error) {
      console.error("Failed to fetch customer:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const runPEPScreening = async () => {
    setScreeningPEP(true);
    try {
      const { data } = await axios.post(
        `${API}/screening/pep/${id}`,
        {},
        { withCredentials: true }
      );
      setPepScreening(data.pep_screening);
      await fetchCustomer(); // Refresh customer data
    } catch (error) {
      console.error("PEP screening failed:", error);
    } finally {
      setScreeningPEP(false);
    }
  };

  const runAdverseMediaScreening = async () => {
    setScreeningAdverseMedia(true);
    try {
      const { data } = await axios.post(
        `${API}/screening/adverse-media/${id}`,
        {},
        { withCredentials: true }
      );
      setAdverseMedia(data.adverse_media_screening);
      await fetchCustomer(); // Refresh customer data
    } catch (error) {
      console.error("Adverse media screening failed:", error);
    } finally {
      setScreeningAdverseMedia(false);
    }
  };

  const markAdverseMediaHit = async (hitId, relevance) => {
    try {
      await axios.post(
        `${API}/screening/adverse-media/${id}/mark-hit`,
        { hit_id: hitId, relevance },
        { withCredentials: true }
      );
      await fetchCustomer(); // Refresh customer data
    } catch (error) {
      console.error("Failed to mark hit:", error);
    }
  };

  const updateCDDStatus = async (status) => {
    setUpdatingCDD(true);
    try {
      await axios.post(
        `${API}/cdd/${id}/update-status`,
        { cdd_status: status },
        { withCredentials: true }
      );
      await fetchCustomer(); // Refresh customer data
    } catch (error) {
      console.error("Failed to update CDD status:", error);
    } finally {
      setUpdatingCDD(false);
    }
  };

  const toggleEDDChecklistItem = async (item) => {
    try {
      const currentValue = eddChecklist?.[item] || false;
      const { data } = await axios.post(
        `${API}/cdd/${id}/edd-checklist`,
        { item, checked: !currentValue },
        { withCredentials: true }
      );
      setEddChecklist(data.edd_checklist);
      await fetchCustomer(); // Refresh customer data
    } catch (error) {
      console.error("Failed to update EDD checklist:", error);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
        Loading customer...
      </div>
    );
  }

  if (!customer) {
    return (
      <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
        Customer not found
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/customers")}
          style={{
            background: "transparent",
            border: "1px solid #1e2530",
            borderRadius: "8px",
            padding: "8px",
            cursor: "pointer",
            color: "#94a3b8"
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 style={{
              fontSize: "26px",
              fontWeight: "700",
              letterSpacing: "-0.5px",
              color: "#f1f5f9"
            }}>
              {customer.customer_data?.full_name || customer.customer_data?.company_legal_name || "Unnamed Customer"}
            </h1>
            {pepScreening?.is_pep && (
              <span
                style={{
                  background: `rgba(${parseInt(getPEPTierColor(pepScreening.pep_tier).slice(1, 3), 16)}, ${parseInt(getPEPTierColor(pepScreening.pep_tier).slice(3, 5), 16)}, ${parseInt(getPEPTierColor(pepScreening.pep_tier).slice(5, 7), 16)}, 0.18)`,
                  color: getPEPTierColor(pepScreening.pep_tier),
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}
                data-testid="pep-badge"
              >
                🔴 PEP DETECTED
              </span>
            )}
          </div>
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>
            {customer.customer_type === "individual" ? "Individual Customer" : "Corporate Customer"} • {customer.id}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <div className="lg:col-span-2">
          <div style={{
            background: "#0d1117",
            border: "1px solid #1e2530",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "24px"
          }}>
            <h2 style={{
              fontSize: "13px",
              fontWeight: "700",
              color: "#f1f5f9",
              marginBottom: "16px"
            }}>Customer Information</h2>

            <div className="grid grid-cols-2 gap-4">
              {customer.customer_type === "individual" && (
                <>
                  <div>
                    <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px" }}>
                      Date of Birth
                    </div>
                    <div style={{ fontSize: "14px", color: "#f1f5f9" }}>
                      {customer.customer_data?.date_of_birth || "N/A"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px" }}>
                      Nationality
                    </div>
                    <div style={{ fontSize: "14px", color: "#f1f5f9" }}>
                      {customer.customer_data?.nationality || "N/A"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px" }}>
                      Country of Residence
                    </div>
                    <div style={{ fontSize: "14px", color: "#f1f5f9" }}>
                      {customer.customer_data?.country_of_residence || "N/A"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px" }}>
                      Occupation
                    </div>
                    <div style={{ fontSize: "14px", color: "#f1f5f9" }}>
                      {customer.customer_data?.occupation || "N/A"}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <PEPScreeningCard
            pepScreening={pepScreening}
            screeningPEP={screeningPEP}
            onRunScreening={runPEPScreening}
          />

          <AdverseMediaCard
            adverseMedia={adverseMedia}
            screeningAdverseMedia={screeningAdverseMedia}
            onRunScreening={runAdverseMediaScreening}
            onMarkHit={markAdverseMediaHit}
          />

          <CDDManagementCard
            customer={customer}
            eddChecklist={eddChecklist}
            updatingCDD={updatingCDD}
            onUpdateCDDStatus={updateCDDStatus}
            onToggleEDDItem={toggleEDDChecklistItem}
          />

          <RelatedCasesCard cases={customer.cases} />
        </div>

        {/* Sidebar */}
        <div>
          <div style={{
            background: "#0d1117",
            border: "1px solid #1e2530",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "24px"
          }}>
            <h2 style={{
              fontSize: "13px",
              fontWeight: "700",
              color: "#f1f5f9",
              marginBottom: "16px"
            }}>Risk Profile</h2>

            <div className="space-y-4">
              <div>
                <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px" }}>
                  Risk Score
                </div>
                <div style={{ fontSize: "28px", fontWeight: "700", color: "#f1f5f9" }}>
                  {customer.risk_score}/100
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px" }}>
                  Risk Level
                </div>
                <span className={`status-badge status-${customer.risk_level}`}>
                  {customer.risk_level}
                </span>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px" }}>
                  CDD Tier
                </div>
                <div style={{ fontSize: "14px", color: "#f1f5f9", textTransform: "uppercase" }}>
                  {customer.cdd_tier}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px" }}>
                  Onboarding Status
                </div>
                <span style={{
                  color: "#94a3b8",
                  fontSize: "12px",
                  padding: "4px 8px",
                  background: "#1e2530",
                  borderRadius: "4px"
                }}>
                  {customer.status.replace("_", " ")}
                </span>
              </div>
            </div>
          </div>

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
            }}>Screening Status</h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span style={{ fontSize: "13px", color: "#94a3b8" }}>Sanctions</span>
                <span className={`status-badge status-${customer.sanctions_status === "no_match" ? "success" : "danger"}`}>
                  {customer.sanctions_status?.replace("_", " ")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: "13px", color: "#94a3b8" }}>PEP</span>
                <span className={`status-badge status-${pepScreening?.is_pep ? "danger" : "success"}`}>
                  {pepScreening?.is_pep ? "Match" : "No Match"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: "13px", color: "#94a3b8" }}>Adverse Media</span>
                <span className={`status-badge status-${adverseMedia?.has_hits ? "warning" : "success"}`}>
                  {adverseMedia?.has_hits ? `${adverseMedia.hits.length} Hits` : "No Hits"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
