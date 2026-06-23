const express = require("express");
const { auth } = require("../middleware/auth");
const { checkServiceability } = require("../services/serviceableArea");

const router = express.Router();
router.use(auth);

router.post("/check", async (req, res) => {
  try {
    const { pinCode, latitude, longitude, city, state, supplierIds } = req.body || {};
    const result = await checkServiceability({
      pinCode,
      latitude,
      longitude,
      city,
      state,
      supplierIds: Array.isArray(supplierIds) ? supplierIds : [],
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
