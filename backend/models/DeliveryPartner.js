const mongoose = require("mongoose");

const VEHICLE_TYPES = ["bike", "van", "bicycle", "tanker", "miniTruck"];

const deliveryPartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    vehicleType: { type: String, required: true, enum: VEHICLE_TYPES },
    vehicleNumber: { type: String, default: "", trim: true },
    licenseDocument: { type: String, default: "" },
    identityDocument: { type: String, default: "" },
    vehicleIdentificationDocument: { type: String, default: "" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    profileImageUrl: { type: String, default: "" },
    onboardingStatus: { type: String, default: "pending", enum: ["pending", "approved"] },
    documentLicenseVerified: { type: Boolean, default: false },
    documentIdentityVerified: { type: Boolean, default: false },
    documentVehicleIdentificationVerified: { type: Boolean, default: false },
    tentativeVerificationTime: { type: String, default: "24-48 hours" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeliveryPartner", deliveryPartnerSchema);
module.exports.VEHICLE_TYPES = VEHICLE_TYPES;
