const mongoose = require("mongoose");

const walletRedeemRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", default: null, index: true },
    amount: { type: Number, required: true, min: 1 },
    accountHolderName: { type: String, required: true, trim: true },
    bankAccountNumber: { type: String, default: "", trim: true },
    ifscCode: { type: String, default: "", trim: true },
    upiId: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    adminNote: { type: String, default: "", trim: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    walletDebitRef: { type: String, default: "" },
  },
  { timestamps: true }
);

walletRedeemRequestSchema.index({ userId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("WalletRedeemRequest", walletRedeemRequestSchema);
