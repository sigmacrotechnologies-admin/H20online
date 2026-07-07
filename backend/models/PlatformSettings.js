const mongoose = require("mongoose");

const additionalTaxSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: "" },
    percent: { type: Number, default: 0, min: 0, max: 100 },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const platformSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "tax-global" },
    gstPercent: { type: Number, default: 18, min: 0, max: 100 },
    serviceTaxPercent: { type: Number, default: 0, min: 0, max: 100 },
    additionalTaxes: { type: [additionalTaxSchema], default: [] },
    razorpayEnabled: { type: Boolean, default: true },
    /** Platform default: % kept from supplier item gross (supplier gets 100 − this) */
    defaultCommissionPercent: { type: Number, default: 20, min: 0, max: 100 },
    /** Platform default: % of order total paid to delivery partner */
    defaultDeliverySharePercent: { type: Number, default: 10, min: 0, max: 100 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlatformSettings", platformSettingsSchema);
