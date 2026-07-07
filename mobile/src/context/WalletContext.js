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

  const addAmount = async () => {
    throw new Error("Use Razorpay wallet top-up from the wallet screen.");
  };

  const deductAmount = async () => {
    throw new Error("Direct wallet debit is not available. Contact admin if you need a balance adjustment.");
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
