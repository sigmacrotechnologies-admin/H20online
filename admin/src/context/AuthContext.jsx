import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../api/client";
import { setAuthToken, getAuthToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api.auth.me()
      .then((u) => setUser(u))
      .catch(() => setAuthToken(""))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { user: u, token } = await api.auth.login(email, password);
    setAuthToken(token);
    setUser(u);
    return u;
  };

  const logout = () => {
    setAuthToken("");
    setUser(null);
  };

  const canSeeFinancials = user && (user.role === "master" || user.role === "admin");
  const canDeleteUser = canSeeFinancials;
  const canRemoveSupplier = canSeeFinancials;
  const canCreateAdmin = canSeeFinancials;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, canSeeFinancials, canDeleteUser, canRemoveSupplier, canCreateAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
