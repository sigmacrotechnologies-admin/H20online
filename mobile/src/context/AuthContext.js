import React, { createContext, useContext, useState, useEffect } from "react";
import { api, setAuthToken, getAuthToken } from "@/src/api/client";

const AUTH_TOKEN_KEY = "h20_auth_token";
let AsyncStorage = null;
try { AsyncStorage = require("@react-native-async-storage/async-storage").default; } catch (_) {}

const AuthContext = createContext(null);

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
          const u = await api.users.me();
          setUser(u);
        }
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const login = async (email, password) => {
    const { user: u, token: t } = await api.auth.login(email, password);
    setToken(t);
    setUser(u);
    return u;
  };

  const loginWithToken = (token, user) => {
    setToken(token);
    setUser(user);
  };

  const register = async (body) => {
    const { user: u, token: t } = await api.auth.register(body);
    setToken(t);
    setUser(u);
    return u;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithToken, register, logout, isAuthenticated, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
