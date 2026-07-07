const express = require("express");
const Order = require("../models/Order");
const { auth } = require("../middleware/auth");
const {
  createRazorpayOrder,
  verifyRazorpaySignature,
  fetchRazorpayPayment,
  isRazorpayConfigured,
  getPublicKeyId,
  isRazorpayTestMode,
} = require("../services/razorpay");
const { getTaxSettings, computeBilling } = require("../services/taxSettings");
const { createCustomerOrder, formatOrderResponse } = require("../services/customerOrderService");
const { parseRazorpayPaymentDetails } = require("../services/orderPayment");
const { creditWalletFromRazorpay } = require("../services/walletTopup");

const router = express.Router();
const MIN_WALLET_TOPUP_RUPEES = 1;

router.post("/razorpay/create-order", auth, async (req, res) => {
  try {
    const settings = await getTaxSettings();
    if (!settings.razorpayEnabled) {
      return res.status(503).json({ error: "Razorpay payments are disabled" });
    }
    if (!isRazorpayConfigured()) {
      return res.status(503).json({
        error:
          "Razorpay is not configured on the server. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env, then restart the backend (npm run dev).",
      });
    }

    const subtotal = Number(req.body.subtotal);
    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      return res.status(400).json({ error: "Valid subtotal required" });
    }

    const billing = computeBilling(subtotal, settings);
    const amountPaise = billing.grandTotal * 100;
    if (amountPaise < 100) {
      return res.status(400).json({ error: "Minimum amount is ₹1 (100 paise)" });
    }

    const receipt = `h2o_${String(req.user._id).slice(-8)}_${Date.now()}`;
    const order = await createRazorpayOrder({ amount: amountPaise, currency: "INR", receipt });

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: getPublicKeyId(),
      billing,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    if (status === 401) return res.status(401).json({ error: "Razorpay authentication failed" });
    if (status === 400) return res.status(400).json({ error: err.message });
    console.error("Razorpay create-order error:", err.message);
    res.status(500).json({ error: err.message || "Failed to create Razorpay order" });
  }
});

router.post("/razorpay/verify-payment", auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order: orderBody } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing payment verification fields" });
    }
    if (!orderBody || !Array.isArray(orderBody.items) || orderBody.items.length === 0) {
      return res.status(400).json({ error: "Order details required" });
    }
    if (!isRazorpayConfigured()) {
      return res.status(503).json({
        error:
          "Razorpay is not configured on the server. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env, then restart the backend (npm run dev).",
      });
    }

    const existing = await Order.findOne({ razorpayPaymentId: razorpay_payment_id }).lean();
    if (existing) {
      return res.json(formatOrderResponse(existing, "razorpay"));
    }

    const valid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!valid) {
      return res.status(400).json({ error: "Payment signature verification failed" });
    }

    let paymentDetails = {};
    try {
      const payment = await fetchRazorpayPayment(razorpay_payment_id);
      paymentDetails = parseRazorpayPaymentDetails(payment) || {};
    } catch (fetchErr) {
      console.warn("Razorpay payment fetch failed:", fetchErr.message);
      paymentDetails = { paidAt: new Date() };
    }

    const result = await createCustomerOrder(
      req.user,
      {
        ...orderBody,
        paymentMethod: "razorpay",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpayTestMode: isRazorpayTestMode(),
        ...paymentDetails,
      },
      {
        paymentMethod: "razorpay",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpayTestMode: isRazorpayTestMode(),
        ...paymentDetails,
      }
    );

    console.log("Razorpay order created:", result.orderId || result.id);
    res.status(201).json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    if (status === 400) return res.status(400).json({ error: err.message });
    console.error("Razorpay verify error:", err.message);
    res.status(500).json({ error: err.message || "Payment verification failed" });
  }
});

router.post("/razorpay/wallet-topup/create-order", auth, async (req, res) => {
  try {
    const settings = await getTaxSettings();
    if (!settings.razorpayEnabled) {
      return res.status(503).json({ error: "Razorpay payments are disabled" });
    }
    if (!isRazorpayConfigured()) {
      return res.status(503).json({ error: "Razorpay is not configured on the server" });
    }

    const amount = Math.round(Number(req.body.amount));
    if (!Number.isFinite(amount) || amount < MIN_WALLET_TOPUP_RUPEES) {
      return res.status(400).json({ error: `Minimum wallet top-up is ₹${MIN_WALLET_TOPUP_RUPEES}` });
    }

    const amountPaise = amount * 100;
    if (amountPaise < 100) {
      return res.status(400).json({ error: "Minimum amount is ₹1 (100 paise)" });
    }

    const receipt = `wallet_${String(req.user._id).slice(-8)}_${Date.now()}`;
    const order = await createRazorpayOrder({ amount: amountPaise, currency: "INR", receipt });

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: getPublicKeyId(),
      topupAmount: amount,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    if (status === 400) return res.status(400).json({ error: err.message });
    console.error("Wallet top-up create-order error:", err.message);
    res.status(500).json({ error: err.message || "Failed to create Razorpay order" });
  }
});

router.post("/razorpay/wallet-topup/verify", auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount: bodyAmount } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing payment verification fields" });
    }
    if (!isRazorpayConfigured()) {
      return res.status(503).json({ error: "Razorpay is not configured on the server" });
    }

    const expectedAmount = Math.round(Number(bodyAmount));
    if (!Number.isFinite(expectedAmount) || expectedAmount < MIN_WALLET_TOPUP_RUPEES) {
      return res.status(400).json({ error: "Valid top-up amount required" });
    }

    const valid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!valid) {
      return res.status(400).json({ error: "Payment signature verification failed" });
    }

    let payment;
    try {
      payment = await fetchRazorpayPayment(razorpay_payment_id);
    } catch (fetchErr) {
      console.error("Wallet top-up payment fetch failed:", fetchErr.message);
      return res.status(400).json({ error: "Could not verify payment with Razorpay" });
    }

    const paidPaise = Number(payment.amount);
    const expectedPaise = expectedAmount * 100;
    if (!Number.isFinite(paidPaise) || paidPaise !== expectedPaise) {
      return res.status(400).json({ error: "Payment amount does not match wallet top-up amount" });
    }
    if (payment.status && payment.status !== "captured" && payment.status !== "authorized") {
      return res.status(400).json({ error: `Payment not completed (status: ${payment.status})` });
    }
    if (payment.order_id && payment.order_id !== razorpay_order_id) {
      return res.status(400).json({ error: "Razorpay order id mismatch" });
    }

    const result = await creditWalletFromRazorpay(req.user._id, expectedAmount, {
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
    });

    res.status(result.alreadyCredited ? 200 : 201).json({
      ...result,
      payment: parseRazorpayPaymentDetails(payment),
    });
  } catch (err) {
    const status = err.statusCode || 500;
    if (status === 400 || status === 409) return res.status(status).json({ error: err.message });
    console.error("Wallet top-up verify error:", err.message);
    res.status(500).json({ error: err.message || "Wallet top-up verification failed" });
  }
});

module.exports = router;
