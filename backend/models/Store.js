const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema(
  {
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    name: { type: String, required: true, trim: true },
    storeType: { type: String, enum: ["store", "warehouse"], default: "store" },
    address: { type: String, trim: true, default: "" },
    locality: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    rejectionReason: { type: String, trim: true, default: "" },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Store", storeSchema);
