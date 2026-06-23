const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { adminAuth, MASTER_EMAIL, MASTER_PASSWORD } = require("../middleware/adminAuth");

const router = express.Router();
const { getJwtSecret } = require("../config/env");

/** POST /api/admin/auth/login - Admin portal login (master static or admin/sub-admin users) */
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const emailTrim = String(email).trim();

    if (emailTrim === MASTER_EMAIL && password === MASTER_PASSWORD) {
      const token = jwt.sign({ master: true }, getJwtSecret(), { expiresIn: "7d" });
      return res.json({
        user: { _id: "master", role: "master", name: "Master Admin", email: MASTER_EMAIL },
        token,
      });
    }

    const user = await User.findOne({ email: emailTrim.toLowerCase() }).select("+password");
    if (!user) return res.status(401).json({ error: "Invalid email or password" });
    if (!["admin", "sub-admin"].includes(user.role)) {
      return res.status(403).json({ error: "Access denied: not an admin user" });
    }
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    const token = jwt.sign({ userId: user._id }, getJwtSecret(), { expiresIn: "7d" });
    const u = await User.findById(user._id).select("-password").lean();
    const out = { ...u, id: u._id.toString(), role: u.role };
    res.json({ user: out, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/admin/auth/me - Current admin user (after login) */
router.get("/auth/me", adminAuth, (req, res) => {
  const u = req.user;
  res.json({
    _id: u._id ? u._id.toString() : "master",
    id: u._id ? u._id.toString() : "master",
    name: u.name,
    email: u.email,
    role: u.role,
  });
});

module.exports = router;
