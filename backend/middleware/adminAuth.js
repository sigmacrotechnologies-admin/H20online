const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getJwtSecret } = require("../config/env");

/** Master credentials — override via env in production */
const MASTER_EMAIL = process.env.MASTER_ADMIN_EMAIL || "H2O admin";
const MASTER_PASSWORD = process.env.MASTER_ADMIN_PASSWORD || "admin@H2O";

/** Verify admin-portal JWT and set req.user (role: master | admin | sub-admin) */
async function adminAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, getJwtSecret());
    if (decoded.master === true) {
      req.user = { _id: null, role: "master", name: "Master Admin", email: MASTER_EMAIL };
      return next();
    }
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) return res.status(401).json({ error: "User not found" });
    if (!["admin", "sub-admin"].includes(user.role)) {
      return res.status(403).json({ error: "Access denied: admin portal only" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/** Require master or admin (not sub-admin) - for financials, delete user, remove supplier, create admin */
function requireMasterOrAdmin(req, res, next) {
  if (req.user.role === "sub-admin") {
    return res.status(403).json({ error: "Permission denied" });
  }
  next();
}

/** Require master or admin for create admin user */
function requireCanCreateAdmin(req, res, next) {
  return requireMasterOrAdmin(req, res, next);
}

/** Require master or admin for delete user */
function requireCanDeleteUser(req, res, next) {
  return requireMasterOrAdmin(req, res, next);
}

/** Require master or admin for remove supplier */
function requireCanRemoveSupplier(req, res, next) {
  return requireMasterOrAdmin(req, res, next);
}

/** Require master or admin for financials */
function requireCanSeeFinancials(req, res, next) {
  return requireMasterOrAdmin(req, res, next);
}

module.exports = {
  adminAuth,
  requireMasterOrAdmin,
  requireCanCreateAdmin,
  requireCanDeleteUser,
  requireCanRemoveSupplier,
  requireCanSeeFinancials,
  MASTER_EMAIL,
  MASTER_PASSWORD,
};
