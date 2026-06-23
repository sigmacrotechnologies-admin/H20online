const DEFAULT_JWT = "h20-secret";
const DEFAULT_MASTER_PASSWORD = "admin@H2O";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function getJwtSecret() {
  return process.env.JWT_SECRET || DEFAULT_JWT;
}

function getAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function validateProductionEnv() {
  if (!isProduction()) return;

  const errors = [];

  if (!process.env.MONGODB_URI) {
    errors.push("MONGODB_URI is required in production");
  }

  const jwt = getJwtSecret();
  if (!jwt || jwt === DEFAULT_JWT || /change-in-production|your-secret/i.test(jwt)) {
    errors.push("JWT_SECRET must be a strong unique value in production");
  }

  const masterPassword = process.env.MASTER_ADMIN_PASSWORD || DEFAULT_MASTER_PASSWORD;
  if (masterPassword === DEFAULT_MASTER_PASSWORD) {
    errors.push("MASTER_ADMIN_PASSWORD must be changed in production");
  }

  if (getAllowedOrigins().length === 0) {
    errors.push("ALLOWED_ORIGINS is required in production (comma-separated admin/API URLs)");
  }

  if (errors.length) {
    console.error("\nProduction environment check failed:\n");
    errors.forEach((e) => console.error("  -", e));
    console.error("\nSet variables in backend/.env then restart.\n");
    process.exit(1);
  }
}

module.exports = {
  isProduction,
  getJwtSecret,
  getAllowedOrigins,
  validateProductionEnv,
  DEFAULT_JWT,
};
