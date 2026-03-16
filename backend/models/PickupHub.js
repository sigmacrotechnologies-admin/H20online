const mongoose = require("mongoose");

const pickupHubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

pickupHubSchema.index({ isActive: 1 });

module.exports = mongoose.model("PickupHub", pickupHubSchema);
