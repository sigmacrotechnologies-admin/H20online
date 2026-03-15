require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const productsRoutes = require("./routes/products");
const ordersRoutes = require("./routes/orders");
const walletRoutes = require("./routes/wallet");
const suppliersRoutes = require("./routes/suppliers");
const waterIntakeRoutes = require("./routes/waterIntake");

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
app.use("/api/users", usersRoutes);
app.use("/api/suppliers", suppliersRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/water-intake", waterIntakeRoutes);

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log("Server on port", PORT);
    console.log("Health check: GET http://localhost:" + PORT + "/api/health");
  });
}

start().catch((err) => {
  console.error("Startup error:", err.message);
  process.exit(1);
});
