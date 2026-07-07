const crypto = require("crypto");
const Razorpay = require("razorpay");

let instance = null;

function isRazorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function getRazorpayInstance() {
  if (!isRazorpayConfigured()) {
    throw new Error("Razorpay credentials not configured");
  }
  if (!instance) {
    instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return instance;
}

async function createRazorpayOrder({ amount, currency = "INR", receipt }) {
  const amountPaise = Math.round(Number(amount));
  if (!Number.isFinite(amountPaise) || amountPaise < 100) {
    const err = new Error("Minimum amount is 100 paise (₹1)");
    err.statusCode = 400;
    throw err;
  }
  const rzp = getRazorpayInstance();
  try {
    return await rzp.orders.create({
      amount: amountPaise,
      currency,
      receipt: String(receipt || `rcpt_${Date.now()}`).slice(0, 40),
    });
  } catch (err) {
    const status = err?.statusCode || err?.error?.statusCode;
    if (status === 401) {
      const authErr = new Error("Razorpay authentication failed");
      authErr.statusCode = 401;
      throw authErr;
    }
    const apiErr = new Error(err?.error?.description || err?.message || "Razorpay API error");
    apiErr.statusCode = status || 500;
    throw apiErr;
  }
}

function verifyRazorpaySignature(orderId, paymentId, signature) {
  if (!isRazorpayConfigured()) return false;
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");
  return expected === signature;
}

function getPublicKeyId() {
  return process.env.RAZORPAY_KEY_ID || "";
}

function isRazorpayTestMode() {
  return String(getPublicKeyId()).startsWith("rzp_test_");
}

async function fetchRazorpayPayment(paymentId) {
  if (!paymentId) {
    const err = new Error("Payment id required");
    err.statusCode = 400;
    throw err;
  }
  const rzp = getRazorpayInstance();
  try {
    return await rzp.payments.fetch(String(paymentId));
  } catch (err) {
    const status = err?.statusCode || err?.error?.statusCode;
    const apiErr = new Error(err?.error?.description || err?.message || "Failed to fetch Razorpay payment");
    apiErr.statusCode = status || 500;
    throw apiErr;
  }
}

module.exports = {
  isRazorpayConfigured,
  createRazorpayOrder,
  verifyRazorpaySignature,
  fetchRazorpayPayment,
  getPublicKeyId,
  isRazorpayTestMode,
};
