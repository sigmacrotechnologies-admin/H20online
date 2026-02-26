const express = require("express");
const Supplier = require("../models/Supplier");
const { auth } = require("../middleware/auth");

const router = express.Router();
router.use(auth);

router.get("/me", async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ userId: req.user._id }).lean();
    if (!supplier) return res.status(404).json({ error: "Supplier profile not found" });
    const out = { ...supplier, id: supplier._id.toString(), _id: supplier._id.toString() };
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
