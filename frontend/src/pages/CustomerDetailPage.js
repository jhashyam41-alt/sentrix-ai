import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, User, Shield, AlertTriangle, FileText, Calendar } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getPEPTierColor = (tier) => {
  if (tier === "tier1") return "#ef4444";
  if (tier === "tier2") return "#f59e0b";
  if (tier === "tier3") return "#f59e0b";
  return "#94a3b8";
};

const getPEPTierLabel = (tier) => {
  if (tier === "tier1") return "Tier 1 - High Risk";
  if (tier === "tier2") return "Tier 2 - Medium Risk";
  if (tier === "tier3") return "Tier 3 - Lower Risk";
  if (tier === "rca") return "RCA - Relative/Associate";
  return "Not PEP";
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

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    try {
      const { data } = await axios.get(`${API}/customers/${id}`, {
        withCredentials: true
      });
      setCustomer(data);
      
      // Check if PEP screening exists
      if (data.pep_screening) {
        setPepScreening(data.pep_screening);
      }
      
      // Check if adverse media screening exists
      if (data.adverse_media_screening) {
        setAdverseMedia(data.adverse_media_screening);
      }
    } catch (error) {
      console.error("Failed to fetch customer:", error);
    } finally {
      setLoading(false);
    }
  };

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

          {/* PEP Screening Results */}
          <div style={{
            background: "#0d1117",
            border: "1px solid #1e2530",
            borderRadius: "12px",
            padding: "24px"
          }}>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{
                fontSize: "13px",
                fontWeight: "700",
                color: "#f1f5f9"
              }}>PEP Screening Results</h2>
              <button
                onClick={runPEPScreening}
                disabled={screeningPEP}
                style={{
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
                  color: "#ffffff",
                  fontWeight: "600",
                  padding: "8px 16px",
                  border: "none",
                  cursor: screeningPEP ? "not-allowed" : "pointer",
                  fontSize: "13px"
                }}
                data-testid="run-pep-screening-btn"
              >
                {screeningPEP ? "Screening..." : "Run PEP Screen"}
              </button>
            </div>

            {!pepScreening ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>
                <Shield className="w-12 h-12 mx-auto mb-4" />
                <p>No PEP screening results yet</p>
                <p style={{ fontSize: "13px", marginTop: "8px" }}>
                  Click "Run PEP Screen" to check PEP status
                </p>
              </div>
            ) : pepScreening.is_pep ? (
              <div>
                {/* PEP Match Alert */}
                <div style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "8px",
                  padding: "16px",
                  marginBottom: "20px"
                }}>
                  <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className="w-5 h-5" style={{ color: "#ef4444" }} />
                    <span style={{ color: "#ef4444", fontSize: "14px", fontWeight: "700" }}>
                      PEP MATCH DETECTED
                    </span>
                  </div>
                  <p style={{ color: "#f87171", fontSize: "13px" }}>
                    This individual has been identified as a Politically Exposed Person. Enhanced due diligence required.
                  </p>
                </div>

                {/* PEP Details */}
                <div style={{
                  background: "#080c12",
                  border: "1px solid #1e2530",
                  borderRadius: "8px",
                  padding: "16px"
                }}>
                  <div className="space-y-3">
                    <div>
                      <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>
                        PEP Category
                      </div>
                      <div style={{
                        display: "inline-block",
                        background: `rgba(${parseInt(getPEPTierColor(pepScreening.pep_tier).slice(1, 3), 16)}, ${parseInt(getPEPTierColor(pepScreening.pep_tier).slice(3, 5), 16)}, ${parseInt(getPEPTierColor(pepScreening.pep_tier).slice(5, 7), 16)}, 0.18)`,
                        color: getPEPTierColor(pepScreening.pep_tier),
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "700"
                      }}>
                        {getPEPTierLabel(pepScreening.pep_tier)}
                      </div>
                    </div>

                    {pepScreening.match_details && (
                      <>
                        <div>
                          <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>
                            Position Held
                          </div>
                          <div style={{ fontSize: "14px", color: "#f1f5f9" }}>
                            {pepScreening.match_details.position}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>
                            Country
                          </div>
                          <div style={{ fontSize: "14px", color: "#f1f5f9" }}>
                            {pepScreening.match_details.country}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>
                            Organization
                          </div>
                          <div style={{ fontSize: "14px", color: "#f1f5f9" }}>
                            {pepScreening.match_details.organisation}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>
                            Status
                          </div>
                          <div style={{ fontSize: "14px", color: "#f1f5f9" }}>
                            {pepScreening.match_details.is_former ? "Former PEP" : "Active PEP"}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>
                            Source
                          </div>
                          <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                            {pepScreening.match_details.source}
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>
                        Last Screened
                      </div>
                      <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                        {new Date(pepScreening.screened_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
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
                <div style={{ color: "#10b981", fontSize: "14px", fontWeight: "700", marginBottom: "4px" }}>
                  ✓ NO PEP MATCH
                </div>
                <div style={{ color: "#94a3b8", fontSize: "13px" }}>
                  No PEP records found for this customer
                </div>
                <div style={{ color: "#475569", fontSize: "12px", marginTop: "8px" }}>
                  Last screened: {new Date(pepScreening.screened_at).toLocaleString()}
                </div>
              </div>
            )}
          </div>

          {/* Adverse Media Screening Results */}
          <div style={{
            background: "#0d1117",
            border: "1px solid #1e2530",
            borderRadius: "12px",
            padding: "24px",
            marginTop: "24px"
          }}>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{
                fontSize: "13px",
                fontWeight: "700",
                color: "#f1f5f9"
              }}>Adverse Media Screening</h2>
              <button
                onClick={runAdverseMediaScreening}
                disabled={screeningAdverseMedia}
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
                data-testid="run-adverse-media-btn"
              >
                {screeningAdverseMedia ? "Screening..." : "Screen News"}
              </button>
            </div>

            {!adverseMedia ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>
                <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                <p>No adverse media screening results yet</p>
                <p style={{ fontSize: "13px", marginTop: "8px" }}>
                  Click "Screen News" to check for negative media coverage
                </p>
              </div>
            ) : adverseMedia.has_hits ? (
              <div>
                {/* Alert */}
                <div style={{
                  background: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: "8px",
                  padding: "16px",
                  marginBottom: "20px"
                }}>
                  <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className="w-5 h-5" style={{ color: "#f59e0b" }} />
                    <span style={{ color: "#f59e0b", fontSize: "14px", fontWeight: "700" }}>
                      ADVERSE MEDIA HITS FOUND
                    </span>
                  </div>
                  <p style={{ color: "#fbbf24", fontSize: "13px" }}>
                    {adverseMedia.hits.length} negative news {adverseMedia.hits.length === 1 ? 'article' : 'articles'} found. Review and mark relevance.
                  </p>
                </div>

                {/* Hits List */}
                <div className="space-y-3">
                  {adverseMedia.hits.map((hit, idx) => (
                    <div
                      key={hit.id}
                      style={{
                        background: "#080c12",
                        border: "1px solid #1e2530",
                        borderRadius: "8px",
                        padding: "16px"
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#f1f5f9",
                            marginBottom: "6px"
                          }}>
                            {hit.headline}
                          </div>
                          <div style={{
                            fontSize: "13px",
                            color: "#94a3b8",
                            marginBottom: "8px"
                          }}>
                            {hit.summary}
                          </div>
                          <div className="flex items-center gap-4" style={{ fontSize: "12px", color: "#475569" }}>
                            <span>{hit.source}</span>
                            <span>•</span>
                            <span>{hit.publication_date}</span>
                            <span>•</span>
                            <span className="status-badge status-warning" style={{ fontSize: "10px" }}>
                              {hit.category.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                        {hit.link && (
                          <a
                            href={hit.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "#2563eb",
                              fontSize: "12px",
                              marginLeft: "16px"
                            }}
                          >
                            View Article →
                          </a>
                        )}
                      </div>

                      {/* Relevance Marking */}
                      <div style={{
                        borderTop: "1px solid #1e2530",
                        paddingTop: "12px",
                        marginTop: "12px"
                      }}>
                        <div style={{
                          fontSize: "11px",
                          color: "#475569",
                          marginBottom: "8px",
                          textTransform: "uppercase",
                          letterSpacing: "1px"
                        }}>
                          Mark Relevance
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => markAdverseMediaHit(hit.id, "relevant")}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "6px",
                              border: "1px solid #1e2530",
                              background: hit.relevance === "relevant" ? "rgba(239, 68, 68, 0.2)" : "#080c12",
                              color: hit.relevance === "relevant" ? "#ef4444" : "#94a3b8",
                              fontSize: "12px",
                              fontWeight: hit.relevance === "relevant" ? "700" : "500",
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                            data-testid={`mark-relevant-${idx}`}
                          >
                            ✓ Relevant
                          </button>
                          <button
                            onClick={() => markAdverseMediaHit(hit.id, "not_relevant")}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "6px",
                              border: "1px solid #1e2530",
                              background: hit.relevance === "not_relevant" ? "rgba(16, 185, 129, 0.2)" : "#080c12",
                              color: hit.relevance === "not_relevant" ? "#10b981" : "#94a3b8",
                              fontSize: "12px",
                              fontWeight: hit.relevance === "not_relevant" ? "700" : "500",
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                            data-testid={`mark-not-relevant-${idx}`}
                          >
                            ✗ Not Relevant
                          </button>
                          <button
                            onClick={() => markAdverseMediaHit(hit.id, "under_review")}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "6px",
                              border: "1px solid #1e2530",
                              background: hit.relevance === "under_review" ? "rgba(245, 158, 11, 0.2)" : "#080c12",
                              color: hit.relevance === "under_review" ? "#f59e0b" : "#94a3b8",
                              fontSize: "12px",
                              fontWeight: hit.relevance === "under_review" ? "700" : "500",
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                            data-testid={`mark-under-review-${idx}`}
                          >
                            ⧗ Under Review
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  marginTop: "16px",
                  padding: "12px",
                  background: "#080c12",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#475569"
                }}>
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
                <div style={{ color: "#10b981", fontSize: "14px", fontWeight: "700", marginBottom: "4px" }}>
                  ✓ NO ADVERSE MEDIA
                </div>
                <div style={{ color: "#94a3b8", fontSize: "13px" }}>
                  No negative news coverage found
                </div>
                <div style={{ color: "#475569", fontSize: "12px", marginTop: "8px" }}>
                  Last screened: {new Date(adverseMedia.screened_at).toLocaleString()}
                </div>
              </div>
            )}
          </div>
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
