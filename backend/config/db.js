const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/h20online";
  const options = {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  };
  try {
    await mongoose.connect(uri, options);
    const dbName = mongoose.connection.db.databaseName;
    console.log("MongoDB connected to database:", dbName);
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    console.error("Make sure MongoDB is running (e.g. mongod or MongoDB Compass / Atlas).");
    process.exit(1);
  }
}

module.exports = connectDB;
