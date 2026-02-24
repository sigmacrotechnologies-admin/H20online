import React, { createContext, useContext, useState } from "react";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [balance, setBalance] = useState(500);

  const addAmount = (amount) => {
    const n = Number(amount);
    if (!isNaN(n) && n > 0) setBalance((b) => b + n);
  };

  const deductAmount = (amount) => {
    const n = Number(amount);
    if (!isNaN(n) && n > 0) setBalance((b) => Math.max(0, b - n));
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
