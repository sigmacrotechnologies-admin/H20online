const mongoose = require("mongoose");

const VEHICLE_TYPES = ["bicycle", "bike", "truck", "minivan", "camper", "cycle"];

const deliveryPartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    vehicleType: { type: String, required: true, enum: VEHICLE_TYPES },
    licenseDocument: { type: String, default: "" },
    identityDocument: { type: String, default: "" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    onboardingStatus: { type: String, default: "pending", enum: ["pending", "approved"] },
    documentLicenseVerified: { type: Boolean, default: false },
    documentIdentityVerified: { type: Boolean, default: false },
    tentativeVerificationTime: { type: String, default: "24-48 hours" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeliveryPartner", deliveryPartnerSchema);
module.exports.VEHICLE_TYPES = VEHICLE_TYPES;
