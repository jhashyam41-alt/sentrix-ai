import React, { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

  const checkAuth = async () => {
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
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email, password) => {
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
  };

  const verify2FA = async (token, tempToken) => {
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
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, verify2FA }}>
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
