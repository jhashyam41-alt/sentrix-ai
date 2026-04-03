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
import AuditLogPage from "./pages/AuditLogPage";
import ScreeningHubPage from "./pages/ScreeningHubPage";
import APIKeysPage from "./pages/APIKeysPage";
import SettingsPage from "./pages/SettingsPage";
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

// CasesPage placeholder removed - using CasesListPage

// AuditLogsPage placeholder removed - using imported AuditLogPage

// SettingsPage placeholder removed - using imported SettingsPage

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
                  <ScreeningHubPage />
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
            path="/api-keys"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <APIKeysPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AuditLogPage />
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
