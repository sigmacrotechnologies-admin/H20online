const mongoose = require("mongoose");

const serviceableAreaSchema = new mongoose.Schema(
  {
    pinCode: { type: String, required: true, trim: true, index: true },
    label: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    latitude: { type: Number },
    longitude: { type: Number },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    radiusKm: { type: Number, default: 10, min: 1, max: 50 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

serviceableAreaSchema.index({ supplierId: 1, pinCode: 1 });

module.exports = mongoose.model("ServiceableArea", serviceableAreaSchema);
