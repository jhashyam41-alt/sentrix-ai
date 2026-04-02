import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import logger from "../utils/logger";

const AuthContext = createContext(null);

// Define API URL outside component to avoid recreating on every render
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/auth/me`, {
        withCredentials: true
      });
      setUser(data);
    } catch (error) {
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []); // API is now a constant, no dependencies needed

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await axios.post(
        `${API}/auth/login`,
        { email, password },
        { withCredentials: true }
      );
      
      if (data.totp_required) {
        return { totp_required: true, temp_token: data.temp_token };
      }
      
      setUser(data.user);
      return { success: true };
    } catch (error) {
      const detail = error.response?.data?.detail;
      const message = Array.isArray(detail) 
        ? detail.map(e => e.msg || JSON.stringify(e)).join(" ")
        : String(detail || "Login failed");
      throw new Error(message);
    }
  }, []); // API is constant

  const verify2FA = useCallback(async (token, tempToken) => {
    try {
      const { data } = await axios.post(
        `${API}/auth/2fa/verify?temp_token=${tempToken}`,
        { token },
        { withCredentials: true }
      );
      setUser(data.user);
      return { success: true };
    } catch (error) {
      const detail = error.response?.data?.detail;
      throw new Error(String(detail || "2FA verification failed"));
    }
  }, []); // API is constant

  const logout = useCallback(async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      logger.error("Logout error:", error);
    } finally {
      setUser(false);
    }
  }, []); // API is constant

  const contextValue = useMemo(() => ({
    user,
    loading,
    login,
    logout,
    verify2FA
  }), [user, loading, login, logout, verify2FA]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
