const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
    planName: { type: String, required: true, trim: true },
    productKey: { type: String, required: true, trim: true },
    productLabel: { type: String, required: true, trim: true },
    frequency: { type: String, required: true, enum: ["daily", "weekly", "monthly"] },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, default: 1 },
    selectedDates: [{ type: String }], // ISO date strings YYYY-MM-DD for delivery dates
    totalPrice: { type: Number, required: true },
    status: { type: String, default: "active", enum: ["active", "cancelled"] },
  },
  { timestamps: true }
);

subscriptionSchema.index({ userId: 1, status: 1 });
module.exports = mongoose.model("Subscription", subscriptionSchema);
