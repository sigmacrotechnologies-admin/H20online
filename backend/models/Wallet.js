const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  type: { type: String, enum: ["credit", "debit"], required: true },
  ref: { type: String, default: "" }, // orderId, billId, "delivery", "supplier_payout", etc.
  createdAt: { type: Date, default: Date.now },
});

const walletSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // null for platform wallet
    ownerType: { type: String, enum: ["user", "platform"], default: "user" },
    balance: { type: Number, default: 0 },
    transactions: [transactionSchema],
  },
  { timestamps: true }
);

walletSchema.index({ userId: 1 }, { unique: true, sparse: true });
walletSchema.index({ ownerType: 1 }, { unique: true, partialFilterExpression: { ownerType: "platform" } });

module.exports = mongoose.model("Wallet", walletSchema);
