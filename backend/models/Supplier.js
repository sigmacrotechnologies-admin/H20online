const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    location: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    businessType: {
      type: String,
      required: true,
      enum: ["waterSupplier", "distributor", "manufacturer", "other", "deliveryAgent"],
    },
    gstNumber: { type: String, trim: true },
    bankAccount: { type: String, trim: true },
    ifscCode: { type: String, trim: true },
    documentIdProof: { type: String, default: "" },
    documentAddressProof: { type: String, default: "" },
    documentBusinessLicense: { type: String, default: "" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    onboardingStatus: { type: String, default: "pending", enum: ["pending", "approved"] },
    verificationCode: { type: String, default: "" },
    rating: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Supplier", supplierSchema);
