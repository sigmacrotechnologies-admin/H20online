const mongoose = require("mongoose");

const societySchema = new mongoose.Schema(
  {
    societyName: { type: String, required: true, trim: true },
    registrationNo: { type: String, required: true, trim: true },
    gstNumber: { type: String, default: "", trim: true },
    pocName: { type: String, required: true, trim: true },
    pocEmail: { type: String, required: true, trim: true, lowercase: true },
    pocPhone: { type: String, required: true, trim: true },
    address: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    onboardingStatus: { type: String, enum: ["pending", "approved"], default: "approved" },
  },
  { timestamps: true }
);

societySchema.index({ registrationNo: 1 });
societySchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model("Society", societySchema);
