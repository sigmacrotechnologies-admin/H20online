require("dotenv").config();
const fs = require("fs");
const path = require("path");
const os = require("os");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { isProduction, getAllowedOrigins, validateProductionEnv } = require("./config/env");

/** Prefer PORT from backend/.env so Expo local URL stays aligned (shell PORT can override dotenv). */
function readPortFromEnvFile() {
  try {
    const envPath = path.join(__dirname, ".env");
    const line = fs
      .readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .find((l) => /^\s*PORT\s*=/.test(l));
    if (!line) return null;
    const m = line.match(/^\s*PORT\s*=\s*(\d+)/);
    return m ? Number(m[1]) : null;
  } catch (_) {
    return null;
  }
}

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return null;
}

const authRoutes = require("./routes/auth");
const adminAuthRoutes = require("./routes/adminAuth");
const adminRoutes = require("./routes/admin");
const usersRoutes = require("./routes/users");
const productsRoutes = require("./routes/products");
const ordersRoutes = require("./routes/orders");
const walletRoutes = require("./routes/wallet");
const suppliersRoutes = require("./routes/suppliers");
const supplierRoutes = require("./routes/supplier");
const deliveryPartnersRoutes = require("./routes/deliveryPartners");
const deliverySupportRoutes = require("./routes/deliverySupport");
const supplierSupportRoutes = require("./routes/supplierSupport");
const customerSupportRoutes = require("./routes/customerSupport");
const waterIntakeRoutes = require("./routes/waterIntake");
const aiRoutes = require("./routes/ai");
const plansRoutes = require("./routes/plans");
const subscriptionsRoutes = require("./routes/subscriptions");
const addressesRoutes = require("./routes/addresses");
const mapsRoutes = require("./routes/maps");
const storesRoutes = require("./routes/stores");
const reviewsRoutes = require("./routes/reviews");
const surveysRoutes = require("./routes/surveys");
const adminSurveysRoutes = require("./routes/adminSurveys");

validateProductionEnv();

const app = express();

if (isProduction()) {
  app.set("trust proxy", 1);
}

const allowedOrigins = getAllowedOrigins();
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (!isProduction() && allowedOrigins.length === 0) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (!isProduction()) return callback(null, true);
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));

if (!isProduction()) {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

app.get("/", (req, res) => res.send("H2Online Backend Running"));

app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const connected = dbState === 1;
  res.json({
    ok: connected,
    db: connected ? "connected" : "disconnected",
    readyState: dbState,
    env: isProduction() ? "production" : "development",
    features: {
      storesApi: true,
      surveysApi: true,
      adminSurveysApi: true,
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/suppliers", suppliersRoutes);
app.use("/api/supplier", supplierRoutes);
app.use("/api/delivery-partners", deliveryPartnersRoutes);
app.use("/api/delivery-support", deliverySupportRoutes);
app.use("/api/supplier-support", supplierSupportRoutes);
app.use("/api/customer-support", customerSupportRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/water-intake", waterIntakeRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/plans", plansRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/bills", require("./routes/bills"));
app.use("/api/addresses", addressesRoutes);
app.use("/api/maps", mapsRoutes);
app.use("/api/stores", storesRoutes);
app.use("/api/surveys", surveysRoutes);
app.use("/api/admin/surveys", adminSurveysRoutes);
app.use("/api/societies", require("./routes/societies"));

function mountAdminStatic() {
  const configured = process.env.ADMIN_DIST_PATH;
  const defaultPath = path.join(__dirname, "..", "admin", "dist");
  const adminDist = configured ? path.resolve(configured) : defaultPath;

  if (!fs.existsSync(adminDist)) {
    if (configured) console.warn("ADMIN_DIST_PATH not found:", adminDist);
    return;
  }

  console.log("Serving admin SPA from:", adminDist);
  app.use(express.static(adminDist, { index: false }));
  app.get(/^(?!\/api\/).*/, (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(adminDist, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

if (isProduction() || process.env.SERVE_ADMIN === "1") {
  mountAdminStatic();
}

app.use((err, req, res, next) => {
  if (err && String(err.message || "").includes("CORS")) {
    return res.status(403).json({ error: "Origin not allowed by CORS policy" });
  }
  return next(err);
});

const PORT = readPortFromEnvFile() || Number(process.env.PORT) || 5000;

async function start() {
  await connectDB();
  const HOST = process.env.HOST || "0.0.0.0";
  app.listen(PORT, HOST, () => {
    console.log("");
    console.log("H2Online backend running on port", PORT, `(${isProduction() ? "production" : "development"})`);
    console.log("Health: http://localhost:" + PORT + "/api/health");
    if (!isProduction()) {
      const localIP = getLocalIP();
      console.log("Stores:  http://localhost:" + PORT + "/api/stores");
      if (localIP) {
        console.log("Mobile .env: EXPO_PUBLIC_API_URL=http://" + localIP + ":" + PORT);
      }
    }
    console.log("");
  });
}

start().catch((err) => {
  console.error("Startup error:", err.message);
  process.exit(1);
});
