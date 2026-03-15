require("dotenv").config();
const os = require("os");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");

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
const supplierSupportRoutes = require("./routes/supplierSupport");
const waterIntakeRoutes = require("./routes/waterIntake");
const plansRoutes = require("./routes/plans");
const subscriptionsRoutes = require("./routes/subscriptions");

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.get("/", (req, res) => res.send("H2Online Backend Running"));

app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const connected = dbState === 1;
  res.json({
    ok: connected,
    db: connected ? "connected" : "disconnected",
    readyState: dbState,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/suppliers", suppliersRoutes);
app.use("/api/supplier", supplierRoutes);
app.use("/api/delivery-partners", deliveryPartnersRoutes);
app.use("/api/supplier-support", supplierSupportRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/water-intake", waterIntakeRoutes);
app.use("/api/plans", plansRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  const HOST = "0.0.0.0"; // so phones/emulators on LAN can reach this server
  app.listen(PORT, HOST, () => {
    const localIP = getLocalIP();
    console.log("");
    console.log("Backend is running on port", PORT);
    console.log("Health: http://localhost:" + PORT + "/api/health");
    if (localIP) {
      console.log("On your phone (Expo Go): in mobile/.env set:");
      console.log("  EXPO_PUBLIC_API_URL=http://" + localIP + ":" + PORT);
      console.log("Then in mobile folder run: npx expo start -c");
    }
    console.log("");
  });
}

start().catch((err) => {
  console.error("Startup error:", err.message);
  process.exit(1);
});
