import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setBalance(0);
      return;
    }
    api.wallet.get().then((data) => setBalance(data.balance ?? 0)).catch(() => setBalance(0));
  }, [isAuthenticated]);

  const addAmount = async (amount) => {
    const n = Number(amount);
    if (isNaN(n) || n <= 0) return;
    if (isAuthenticated) {
      try {
        const data = await api.wallet.credit(n);
        setBalance(data.balance);
      } catch (_) {}
      return;
    }
    setBalance((b) => b + n);
  };

  const deductAmount = async (amount) => {
    const n = Number(amount);
    if (isNaN(n) || n <= 0) return;
    if (isAuthenticated) {
      try {
        const data = await api.wallet.debit(n);
        setBalance(data.balance);
      } catch (_) {}
      return;
    }
    setBalance((b) => Math.max(0, b - n));
  };

  return (
    <WalletContext.Provider value={{ balance, addAmount, deductAmount, setBalance }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
