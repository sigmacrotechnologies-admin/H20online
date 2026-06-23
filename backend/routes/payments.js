const express = require("express");
const { auth } = require("../middleware/auth");
const { createRazorpayOrder, verifyRazorpaySignature, isRazorpayConfigured, getPublicKeyId } = require("../services/razorpay");
const { getTaxSettings, computeBilling } = require("../services/taxSettings");
const { createCustomerOrder } = require("../services/customerOrderService");

const router = express.Router();

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

    const valid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!valid) {
      return res.status(400).json({ error: "Payment signature verification failed" });
    }

    const result = await createCustomerOrder(req.user, {
      ...orderBody,
      paymentMethod: "razorpay",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    }, {
      paymentMethod: "razorpay",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });

    console.log("Razorpay order created:", result.id);
    res.status(201).json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    if (status === 400) return res.status(400).json({ error: err.message });
    console.error("Razorpay verify error:", err.message);
    res.status(500).json({ error: err.message || "Payment verification failed" });
  }
});

module.exports = router;
