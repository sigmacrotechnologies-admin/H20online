const mongoose = require("mongoose");

function generateSubscriptionId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "SUB-";
  for (let i = 0; i < 8; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  return id;
}

const subscriptionSchema = new mongoose.Schema(
  {
    subscriptionId: { type: String, unique: true, sparse: true, trim: true }, // human-readable ID e.g. SUB-XXXXXXXX; backfilled for old docs
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
    planName: { type: String, required: true, trim: true },
    productId: { type: String, trim: true }, // from plan product (productId field)
    productKey: { type: String, required: true, trim: true },
    productLabel: { type: String, required: true, trim: true },
    frequency: { type: String, required: true, enum: ["daily", "weekly", "monthly"] },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, default: 1 },
    selectedDates: [{ type: String }], // ISO date strings YYYY-MM-DD for delivery dates
    totalPrice: { type: Number, required: true },
    status: { type: String, default: "active", enum: ["active", "cancelled", "inactive"] }, // inactive = admin-paused
    preferredDeliveryTime: { type: String, trim: true }, // display e.g. "11:00 AM - 12:00 PM" (from user's time range)
    preferredTimeRangeStart: { type: String, trim: true }, // user-given window start e.g. "11:00 AM"
    preferredTimeRangeEnd: { type: String, trim: true },   // user-given window end e.g. "12:00 PM"
    deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryPartner", default: null },
    pickupHubId: { type: mongoose.Schema.Types.ObjectId, ref: "PickupHub", default: null },
    deliveryAddress: { type: String, trim: true }, // customer delivery address for this subscription
    locality: { type: String, trim: true },        // for admin filter & assign by area
    pinCode: { type: String, trim: true },        // for admin filter & assign by pin
    subscriptionChannel: { type: String, enum: ["customer", "society", "supplier"], default: "customer" },
    planCategory: { type: String, enum: ["individual", "bulk", "society"], default: "individual" },
  },
  { timestamps: true }
);

subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ subscriptionId: 1 });
subscriptionSchema.index({ subscriptionChannel: 1, status: 1, createdAt: -1 });

subscriptionSchema.statics.generateUniqueSubscriptionId = async function () {
  let id;
  let exists = true;
  while (exists) {
    id = generateSubscriptionId();
    exists = await this.exists({ subscriptionId: id });
  }
  return id;
};

subscriptionSchema.pre("save", async function () {
  if (!this.subscriptionId) {
    this.subscriptionId = await this.constructor.generateUniqueSubscriptionId();
  }
});

module.exports = mongoose.model("Subscription", subscriptionSchema);
