#!/usr/bin/env node
/**
 * Check if MongoDB is running and reachable.
 * Run from backend folder: node scripts/check-mongo.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/h20online";

mongoose
  .connect(uri, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log("MongoDB is running. Database:", mongoose.connection.db.databaseName);
    process.exit(0);
  })
  .catch((err) => {
    console.error("MongoDB is NOT reachable:", err.message);
    console.error("Start MongoDB (e.g. run 'mongod' or start MongoDB service), then run: npm run dev");
    process.exit(1);
  });
