const express = require("express");
const { getTaxSettings } = require("../services/taxSettings");
const { getPublicKeyId, isRazorpayConfigured } = require("../services/razorpay");

const router = express.Router();

router.get("/tax", async (req, res) => {
  try {
    const settings = await getTaxSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/payment", async (req, res) => {
  try {
    const settings = await getTaxSettings();
    res.json({
      razorpayEnabled: settings.razorpayEnabled && isRazorpayConfigured(),
      razorpayKeyId: getPublicKeyId(),
      razorpayTestMode: String(getPublicKeyId()).startsWith("rzp_test_"),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
