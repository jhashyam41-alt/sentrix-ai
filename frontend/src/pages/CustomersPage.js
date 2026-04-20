import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logger from "../utils/logger";
import { Plus, Search, Filter, X, CheckCircle, Clock, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { RiskLevelBadge } from "../components/screening/RiskScoreCircle";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const KYC_CONFIG = {
  verified: { icon: CheckCircle, color: "#10b981", label: "Verified" },
  pending: { icon: Clock, color: "#f59e0b", label: "Pending" },
  failed: { icon: XCircle, color: "#ef4444", label: "Failed" },
};

const CDD_LABELS = { sdd: "SDD", standard_cdd: "Standard", edd: "EDD" };
const CDD_COLORS = { sdd: "#10b981", standard_cdd: "#2563eb", edd: "#ef4444" };

const COUNTRIES = [
  { code: "", label: "All Countries" },
  { code: "IN", label: "India" }, { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" }, { code: "PK", label: "Pakistan" },
  { code: "AE", label: "UAE" }, { code: "SG", label: "Singapore" },
];

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 15;

  // Filters
  const [search, setSearch] = useState("");
  const [filterRisk, setFilterRisk] = useState("");
  const [filterKYC, setFilterKYC] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // API, axios, logger are module-level constants — only reactive filter state listed
  const fetchCustomers = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit, skip: (p - 1) * limit });
      if (search) params.set("search", search);
      if (filterRisk) params.set("risk_level", filterRisk);
      if (filterKYC) params.set("kyc_status", filterKYC);
      if (filterCountry) params.set("nationality", filterCountry);
      const { data } = await axios.get(`${API}/customers?${params}`, { withCredentials: true });
      setCustomers(data.customers || []);
      setTotal(data.total || 0);
      setPage(p);
    } catch (err) {
      logger.error("Failed to fetch customers:", err);
    } finally {
      setLoading(false);
    }
  }, [search, filterRisk, filterKYC, filterCountry]);

  useEffect(() => { fetchCustomers(1); }, [fetchCustomers]);

  const pages = Math.ceil(total / limit);
  const clearFilters = () => { setFilterRisk(""); setFilterKYC(""); setFilterCountry(""); setSearch(""); };
  const hasFilters = filterRisk || filterKYC || filterCountry || search;

  return (
    <div data-testid="customers-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "-0.5px", color: "#f1f5f9", marginBottom: "4px" }}
              data-testid="customers-title">
            Customers
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>{total} total customers</p>
        </div>
        <button onClick={() => navigate("/customers/new")} className="btn-primary" data-testid="add-customer-btn"
          style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2" style={{
          background: "#0d1117", border: "1px solid #1e2530", borderRadius: "8px",
          padding: "8px 14px", flex: 1, maxWidth: "360px",
        }}>
          <Search style={{ width: 14, height: 14, color: "#475569" }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID..." data-testid="customer-search"
            style={{ background: "transparent", border: "none", outline: "none", color: "#f1f5f9", fontSize: "13px", width: "100%" }} />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#475569", padding: 0 }}>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <button onClick={() => setShowFilters(!showFilters)} data-testid="toggle-filters"
          style={{
            display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px",
            borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer",
            border: showFilters ? "1px solid #2563eb" : "1px solid #1e2530",
            background: showFilters ? "rgba(37,99,235,0.1)" : "#0d1117",
            color: showFilters ? "#60a5fa" : "#94a3b8",
          }}>
          <Filter className="w-4 h-4" /> Filters
          {hasFilters && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563eb" }} />}
        </button>

        {hasFilters && (
          <button onClick={clearFilters} data-testid="clear-filters"
            style={{ fontSize: "12px", color: "#ef4444", background: "transparent", border: "none", cursor: "pointer" }}>
            Clear all
          </button>
        )}
      </div>

      {/* Filter Dropdowns */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5" data-testid="filter-panel"
          style={{ padding: "16px", background: "#0d1117", borderRadius: "10px", border: "1px solid #1e2530" }}>
          <div>
            <label style={labelStyle}>Risk Level</label>
            <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)}
              className="input-aml w-full" data-testid="filter-risk" style={{ colorScheme: "dark" }}>
              <option value="">All Levels</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>KYC Status</label>
            <select value={filterKYC} onChange={(e) => setFilterKYC(e.target.value)}
              className="input-aml w-full" data-testid="filter-kyc" style={{ colorScheme: "dark" }}>
              <option value="">All Statuses</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Country</label>
            <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)}
              className="input-aml w-full" data-testid="filter-country" style={{ colorScheme: "dark" }}>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card-aml" style={{ padding: 0, overflow: "hidden" }} data-testid="customers-table">
        {/* Header */}
        <div style={{
          display: "grid", gridTemplateColumns: "2.2fr 0.9fr 1fr 1fr 1.2fr 0.9fr 0.8fr",
          gap: "8px", padding: "12px 24px", background: "#080c12", borderBottom: "1px solid #1e2530",
          fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", color: "#475569",
        }}>
          <span>Name</span>
          <span>ID Type</span>
          <span>KYC Status</span>
          <span>Risk Level</span>
          <span>Last Screened</span>
          <span>CDD Tier</span>
          <span>Actions</span>
        </div>

        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#475569" }}>Loading...</div>
        ) : customers.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#475569" }}>No customers found</div>
        ) : (
          <>
            {customers.map((c) => {
              const name = c.customer_data?.full_name || c.customer_data?.company_legal_name || "Unnamed";
              const kycCfg = KYC_CONFIG[c.kyc_status] || KYC_CONFIG.pending;
              const KycIcon = kycCfg.icon;
              const rl = (c.risk_level || "low").toUpperCase();

              return (
                <div key={c.id} data-testid={`customer-row-${c.id}`}
                  onClick={() => navigate(`/customers/${c.id}`)}
                  style={{
                    display: "grid", gridTemplateColumns: "2.2fr 0.9fr 1fr 1fr 1.2fr 0.9fr 0.8fr",
                    gap: "8px", padding: "14px 24px", borderBottom: "1px solid #0f1520",
                    alignItems: "center", cursor: "pointer", transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#0f1520"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Name */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9" }}>{name}</span>
                      {c.country_risk?.level === "black_list" && (
                        <span style={{
                          fontSize: "8px", fontWeight: 800, padding: "1px 5px", borderRadius: "3px",
                          background: "rgba(239,68,68,0.12)", color: "#ef4444", letterSpacing: "0.3px",
                        }}>BL</span>
                      )}
                      {c.country_risk?.level === "grey_list" && (
                        <span style={{
                          fontSize: "8px", fontWeight: 800, padding: "1px 5px", borderRadius: "3px",
                          background: "rgba(245,158,11,0.12)", color: "#f59e0b", letterSpacing: "0.3px",
                        }}>GL</span>
                      )}
                    </div>
                    <div style={{ fontSize: "11px", color: "#475569" }}>
                      {c.customer_data?.nationality || "\u2014"} {c.customer_data?.occupation ? `\u2022 ${c.customer_data.occupation}` : ""}
                    </div>
                  </div>

                  {/* ID Type */}
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>{c.id_type || "—"}</span>

                  {/* KYC Status */}
                  <div className="flex items-center gap-1">
                    <KycIcon style={{ width: 14, height: 14, color: kycCfg.color }} />
                    <span style={{ fontSize: "12px", fontWeight: 600, color: kycCfg.color }}>{kycCfg.label}</span>
                  </div>

                  {/* Risk Level */}
                  <div><RiskLevelBadge level={rl} /></div>

                  {/* Last Screened */}
                  <span style={{ fontSize: "12px", color: "#475569" }}>
                    {c.last_screened ? new Date(c.last_screened).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Never"}
                  </span>

                  {/* CDD Tier */}
                  <span style={{
                    fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "4px",
                    color: CDD_COLORS[c.cdd_tier] || "#94a3b8",
                    background: `${CDD_COLORS[c.cdd_tier] || "#94a3b8"}18`,
                    textTransform: "uppercase",
                  }}>
                    {CDD_LABELS[c.cdd_tier] || c.cdd_tier || "—"}
                  </span>

                  {/* Actions */}
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/customers/${c.id}`); }}
                    data-testid={`view-customer-${c.id}`}
                    style={{
                      background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.25)",
                      borderRadius: "6px", padding: "5px 12px", cursor: "pointer", color: "#60a5fa",
                      fontSize: "11px", fontWeight: 600,
                    }}>
                    View
                  </button>
                </div>
              );
            })}

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between" style={{ padding: "14px 24px", borderTop: "1px solid #1e2530" }}>
                <span style={{ fontSize: "12px", color: "#475569" }}>Page {page} of {pages}</span>
                <div className="flex gap-2">
                  <button onClick={() => fetchCustomers(page - 1)} disabled={page <= 1}
                    style={{ ...paginationBtn, opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? "not-allowed" : "pointer" }}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => fetchCustomers(page + 1)} disabled={page >= pages}
                    style={{ ...paginationBtn, opacity: page >= pages ? 0.4 : 1, cursor: page >= pages ? "not-allowed" : "pointer" }}>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const labelStyle = { fontSize: "12px", color: "#94a3b8", marginBottom: "4px", display: "block", fontWeight: 500 };
const paginationBtn = { background: "#080c12", border: "1px solid #1e2530", borderRadius: "6px", padding: "6px 10px", color: "#94a3b8" };
