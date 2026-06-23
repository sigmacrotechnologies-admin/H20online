const mongoose = require("mongoose");
const { prepareAtlasDns, mongooseOptions } = require("./mongo");

async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/h20online";
  prepareAtlasDns(uri);
  try {
    await mongoose.connect(uri, mongooseOptions);
    const dbName = mongoose.connection.db.databaseName;
    console.log("MongoDB connected to database:", dbName);
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    if (String(uri).startsWith("mongodb+srv://")) {
      console.error("MongoDB Atlas checklist:");
      console.error("  1. MONGODB_URI in backend/.env (Atlas → Connect → Drivers)");
      console.error("  2. Network Access: allow your IP (or 0.0.0.0/0 for dev)");
      console.error("  3. Database user password is correct (no special chars unescaped in URI)");
      console.error("  4. If SRV/DNS fails, use the standard mongodb:// connection string from Atlas");
    } else {
      console.error("Local MongoDB: start mongod or set MONGODB_URI to your Atlas cluster.");
    }
    process.exit(1);
  }
}

module.exports = connectDB;
