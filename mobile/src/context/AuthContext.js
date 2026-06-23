import React, { createContext, useContext, useState, useEffect } from "react";
import { api, setAuthToken, getAuthToken } from "@/src/api/client";

const AUTH_TOKEN_KEY = "h20_auth_token";
let AsyncStorage = null;
try { AsyncStorage = require("@react-native-async-storage/async-storage").default; } catch (_) {}

const AuthContext = createContext(null);

function normalizeUser(u) {
  if (!u) return null;
  const id = u.id || (u._id != null ? String(u._id) : undefined);
  return { ...u, id, _id: id, role: u.role || "customer" };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(null);
  const [loading, setLoading] = useState(true);

  const setToken = (t) => {
    setAuthToken(t);
    setTokenState(t);
    if (AsyncStorage) { if (t) AsyncStorage.setItem(AUTH_TOKEN_KEY, t); else AsyncStorage.removeItem(AUTH_TOKEN_KEY); }
  };

  useEffect(() => {
    (async () => {
      try {
        let stored = null;
        if (AsyncStorage) stored = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (stored) {
          setAuthToken(stored);
          setTokenState(stored);
          try {
            const u = await api.users.me();
            setUser(normalizeUser(u));
          } catch (_) {
            setAuthToken(null);
            setTokenState(null);
            if (AsyncStorage) await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
          }
        }
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const login = async (email, password) => {
    const { user: u, token: t } = await api.auth.login(email, password);
    const normalized = normalizeUser(u);
    setToken(t);
    setUser(normalized);
    return normalized;
  };

  const loginWithToken = (token, user) => {
    setToken(token);
    setUser(normalizeUser(user));
  };

  const register = async (body) => {
    const { user: u, token: t } = await api.auth.register(body);
    const normalized = normalizeUser(u);
    setToken(t);
    setUser(normalized);
    return normalized;
  };

  const registerSociety = async (body) => {
    const { user: u, token: t } = await api.auth.registerSociety(body);
    const normalized = normalizeUser(u);
    setToken(t);
    setUser(normalized);
    return normalized;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithToken, register, registerSociety, logout, isAuthenticated, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
