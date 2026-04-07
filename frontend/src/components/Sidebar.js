import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Shield, LayoutDashboard, Users, FileSearch, AlertCircle,
  FileText, Settings, LogOut, Bell, Key
} from "lucide-react";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/customers", icon: Users, label: "Customers" },
    { path: "/screening", icon: FileSearch, label: "Screening" },
    { path: "/cases", icon: AlertCircle, label: "Cases" },
    { path: "/api-keys", icon: Key, label: "API Keys" },
    { path: "/audit-logs", icon: FileText, label: "Audit Logs" },
    { path: "/settings", icon: Settings, label: "Settings" }
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div style={{
      width: "220px",
      background: "#0d1117",
      borderRight: "1px solid #1e2530",
      height: "100vh",
      position: "fixed",
      left: 0,
      top: 0,
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Logo */}
      <a
        href="https://rudrik.io"
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: "none" }}
        data-testid="sidebar-logo-link"
      >
        <div style={{
          padding: "24px 20px",
          borderBottom: "1px solid #1e2530",
          cursor: "pointer",
          transition: "background 0.2s ease",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#131923"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <div className="flex items-center gap-3">
            <img
              src="/rudrik-logo.svg"
              alt="Rudrik"
              style={{ width: "36px", height: "36px", borderRadius: "6px" }}
            />
            <div>
              <div style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "#f1f5f9",
                letterSpacing: "-0.3px"
              }}>Rudrik</div>
              <div style={{
                fontSize: "10px",
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>Compliance Intelligence</div>
            </div>
          </div>
        </div>
      </a>

      {/* Navigation */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 0"
      }}>
        <div style={{
          fontSize: "10px",
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: "2px",
          color: "#2563eb",
          padding: "0 20px",
          marginBottom: "12px"
        }}>Main Menu</div>
        
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 20px",
                color: isActive ? "#f1f5f9" : "#94a3b8",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: isActive ? "600" : "400",
                borderLeft: isActive ? "3px solid #2563eb" : "3px solid transparent",
                background: isActive ? "linear-gradient(90deg, #1e3a5f, #1e2d45)" : "transparent",
                transition: "all 0.2s ease"
              }}
              data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "#1e2530";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* User Profile */}
      <div style={{
        borderTop: "1px solid #1e2530",
        padding: "16px 20px"
      }}>
        <div className="flex items-center justify-between mb-3">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: "13px",
              fontWeight: "600",
              color: "#f1f5f9",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}>{user?.name || "User"}</div>
            <div style={{
              fontSize: "11px",
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>{user?.role?.replace("_", " ")}</div>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            style={{
              background: "transparent",
              border: "1px solid #1e2530",
              borderRadius: "6px",
              padding: "6px",
              cursor: "pointer",
              color: "#94a3b8",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#1e2530";
              e.currentTarget.style.color = "#f1f5f9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#94a3b8";
            }}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 20px", borderTop: "1px solid #1e2530" }}>
        <div style={{ fontSize: "9px", color: "#334155", textAlign: "center", lineHeight: "1.4" }}>
          &copy; 2026 Rudrik Technologies Pvt. Ltd.
        </div>
        <a
          href="https://rudrik.io"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="sidebar-website-link"
          style={{
            display: "block",
            fontSize: "9px",
            color: "#475569",
            textAlign: "center",
            marginTop: "4px",
            textDecoration: "none",
            transition: "color 0.2s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#2563eb"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#475569"; }}
        >
          www.rudrik.io
        </a>
      </div>
    </div>
  );
}
