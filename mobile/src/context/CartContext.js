import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";

const DOCS_DEMO_CART = [
  { id: "docs-demo-1", productName: "AquaPure Premium 20L Jar", supplierName: "AquaPure Water Co.", price: 180, qty: 2 },
  { id: "docs-demo-2", productName: "BlueSprings Local 20L Jar", supplierName: "BlueSprings Hydration Hub", price: 120, qty: 1 },
];

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [checkoutDetails, setCheckoutDetailsState] = useState(null);

  const refreshOrders = useCallback(() => {
    if (!isAuthenticated) return Promise.resolve();
    return api.orders.list().then((list) => setOrders(Array.isArray(list) ? list : [])).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("docs") === "1") {
      setCart(DOCS_DEMO_CART);
      setCheckoutDetailsState({
        address: "Flat 402, Sunrise Apartments, Andheri West, Mumbai 400053",
        receiverName: "Rohit Sharma",
        receiverPhone: "9988776655",
      });
    }
  }, []);

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

  /** Set cart to a single item for "Buy Now" flow, then navigate to checkout */
  const setCartForBuyNow = (item, qty = 1) => {
    setCart([{ ...item, qty }]);
  };

  const cartCount = cart.reduce((sum, i) => sum + (i.qty || 1), 0);
  const cartTotal = cart.reduce((sum, i) => sum + (i.price || 0) * (i.qty || 1), 0);

  const setCheckoutDetails = (details) => setCheckoutDetailsState(details);
  const getCheckoutDetails = () => checkoutDetails;

  const placeOrder = async (paymentMethod, details) => {
    if (cart.length === 0) return null;
    const address = (details && details.address) || "";
    const receiverName = (details && details.receiverName) || null;
    const receiverPhone = (details && details.receiverPhone) || null;
    const scheduledAt = (details && details.scheduledAt) || null;
    if (isAuthenticated) {
      try {
        const payload = {
          items: cart,
          total: cartTotal,
          paymentMethod: paymentMethod || "card",
          address,
          receiverName,
          receiverPhone,
          scheduledAt,
          customerLatitude: details?.customerLatitude ?? null,
          customerLongitude: details?.customerLongitude ?? null,
        };
        if (user?.role === "society") payload.orderChannel = "society";
        const order = await api.orders.create(payload);
        setOrders((prev) => [order, ...prev]);
        setCart([]);
        setCheckoutDetailsState(null);
        api.orders.list().then((list) => { if (Array.isArray(list) && list.length > 0) setOrders(list); }).catch(() => {});
        return order;
      } catch (err) {
        throw err;
      }
    }
    const order = {
      id: `ord_${Date.now()}`,
      items: [...cart],
      total: cartTotal,
      paymentMethod: paymentMethod || "Card",
      status: "in_progress",
      date: new Date().toISOString(),
      address: address || "Current location (tap to change)",
    };
    setOrders((prev) => [order, ...prev]);
    setCart([]);
    setCheckoutDetailsState(null);
    return order;
  };

  const getLatestOrder = () => orders[0] || null;

  const matchOrderId = (o, id) => (o && id && (o.id === id || o._id === id || o.orderId === id));

  const cancelOrder = async (orderId) => {
    if (isAuthenticated) {
      try {
        await api.orders.cancel(orderId);
        setOrders((prev) => prev.map((o) => (matchOrderId(o, orderId) ? { ...o, status: "cancelled" } : o)));
      } catch (_) {}
      return;
    }
    setOrders((prev) => prev.map((o) => (matchOrderId(o, orderId) ? { ...o, status: "cancelled" } : o)));
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
        setCartForBuyNow,
        placeOrder,
        setCheckoutDetails,
        getCheckoutDetails,
        getLatestOrder,
        refreshOrders,
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
