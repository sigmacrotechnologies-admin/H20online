#!/usr/bin/env node
/**
 * Check if MongoDB (Atlas or local) is reachable.
 * Run from backend folder: node scripts/check-mongo.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const { prepareAtlasDns, mongooseOptions } = require("../config/mongo");

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/h20online";
prepareAtlasDns(uri);

mongoose
  .connect(uri, mongooseOptions)
  .then(() => {
    console.log("MongoDB is reachable. Database:", mongoose.connection.db.databaseName);
    return mongoose.disconnect();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("MongoDB is NOT reachable:", err.message);
    if (String(uri).startsWith("mongodb+srv://")) {
      console.error("Using Atlas — no local mongod needed. Check Atlas Network Access and MONGODB_URI in .env");
    } else {
      console.error("Start local MongoDB or set MONGODB_URI to your Atlas connection string.");
    }
    process.exit(1);
  });
