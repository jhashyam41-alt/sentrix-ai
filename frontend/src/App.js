import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Sidebar from "./components/Sidebar";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CustomersPage from "./pages/CustomersPage";
import CustomerDetailPage from "./pages/CustomerDetailPage";
import CasesListPage from "./pages/CasesListPage";
import CaseDetailPage from "./pages/CaseDetailPage";
import "@/App.css";

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#080c12",
        color: "#94a3b8"
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Layout with Sidebar
function DashboardLayout({ children }) {
  return (
    <div style={{ display: "flex", background: "#080c12", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{
        marginLeft: "220px",
        flex: 1,
        padding: "32px",
        maxWidth: "1600px"
      }}>
        {children}
      </div>
    </div>
  );
}

// Placeholder pages
function ScreeningPage() {
  return (
    <div>
      <h1 style={{
        fontSize: "26px",
        fontWeight: "700",
        letterSpacing: "-0.5px",
        color: "#f1f5f9",
        marginBottom: "8px"
      }}>Screening Hub</h1>
      <p style={{ color: "#94a3b8", fontSize: "14px" }}>
        Run sanctions, PEP, and adverse media screenings
      </p>
      <div style={{
        background: "#0d1117",
        border: "1px solid #1e2530",
        borderRadius: "12px",
        padding: "60px 24px",
        marginTop: "24px",
        textAlign: "center",
        color: "#475569"
      }}>
        Screening functionality coming soon
      </div>
    </div>
  );
}

// CasesPage placeholder removed - using CasesListPage

function AuditLogsPage() {
  return (
    <div>
      <h1 style={{
        fontSize: "26px",
        fontWeight: "700",
        letterSpacing: "-0.5px",
        color: "#f1f5f9",
        marginBottom: "8px"
      }}>Audit Logs</h1>
      <p style={{ color: "#94a3b8", fontSize: "14px" }}>
        Immutable audit trail of all system activities
      </p>
      <div style={{
        background: "#0d1117",
        border: "1px solid #1e2530",
        borderRadius: "12px",
        padding: "60px 24px",
        marginTop: "24px",
        textAlign: "center",
        color: "#475569"
      }}>
        Audit logs coming soon
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div>
      <h1 style={{
        fontSize: "26px",
        fontWeight: "700",
        letterSpacing: "-0.5px",
        color: "#f1f5f9",
        marginBottom: "8px"
      }}>Settings</h1>
      <p style={{ color: "#94a3b8", fontSize: "14px" }}>
        Configure tenant settings and user management
      </p>
      <div style={{
        background: "#0d1117",
        border: "1px solid #1e2530",
        borderRadius: "12px",
        padding: "60px 24px",
        marginTop: "24px",
        textAlign: "center",
        color: "#475569"
      }}>
        Settings coming soon
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DashboardPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CustomersPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/customers/:id"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CustomerDetailPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/screening"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ScreeningPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/cases"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CasesListPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/cases/:id"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CaseDetailPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AuditLogsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SettingsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
