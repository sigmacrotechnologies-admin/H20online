const mongoose = require("mongoose");

const subscriptionBillSchema = new mongoose.Schema(
  {
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    period: { type: String, required: true }, // "YYYY-MM"
    generatedAt: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true }, // 5 days from 1st of month
    status: { type: String, enum: ["pending", "paid", "overdue"], default: "pending" },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

subscriptionBillSchema.index({ userId: 1, period: 1 });
subscriptionBillSchema.index({ subscriptionId: 1, period: 1 }, { unique: true });

module.exports = mongoose.model("SubscriptionBill", subscriptionBillSchema);
