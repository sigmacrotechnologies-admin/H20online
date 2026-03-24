const mongoose = require("mongoose");

const savedAddressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    houseNumber: { type: String, trim: true },
    locality: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pinCode: { type: String, trim: true },
    phoneNumber: { type: String, trim: true, required: true },
    fullAddress: { type: String, trim: true }, // built from parts for display/delivery
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

savedAddressSchema.index({ userId: 1 });

function buildFullAddress(doc) {
  const parts = [doc.houseNumber, doc.locality, doc.city, doc.state, doc.pinCode].filter(Boolean);
  return parts.join(", ") || "";
}

savedAddressSchema.pre("save", function () {
  if (this.houseNumber || this.locality || this.city || this.state || this.pinCode) {
    this.fullAddress = buildFullAddress(this);
  }
});

module.exports = mongoose.model("SavedAddress", savedAddressSchema);
