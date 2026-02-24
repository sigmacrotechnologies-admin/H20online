import React, { createContext, useContext, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);

  const addToCart = (item, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + qty } : i));
      }
      return [...prev, { ...item, qty }];
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const updateCartQty = (id, qty) => {
    if (qty < 1) {
      removeFromCart(id);
      return;
    }
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
  };

  const clearCart = () => setCart([]);

  const cartCount = cart.reduce((sum, i) => sum + (i.qty || 1), 0);
  const cartTotal = cart.reduce((sum, i) => sum + (i.price || 0) * (i.qty || 1), 0);

  const placeOrder = (paymentMethod) => {
    if (cart.length === 0) return null;
    const order = {
      id: `ord_${Date.now()}`,
      items: [...cart],
      total: cartTotal,
      paymentMethod: paymentMethod || "Card",
      status: "in_progress",
      date: new Date().toISOString(),
      address: "Current location (tap to change)",
    };
    setOrders((prev) => [order, ...prev]);
    clearCart();
    return order;
  };

  const getLatestOrder = () => orders[0] || null;
  const cancelOrder = (orderId) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o)));
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        cartTotal,
        orders,
        addToCart,
        removeFromCart,
        updateCartQty,
        clearCart,
        placeOrder,
        getLatestOrder,
        cancelOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
