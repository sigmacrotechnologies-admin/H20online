const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
  productName: { type: String, default: "" },
  supplierName: { type: String, default: "" },
  supplierId: { type: mongoose.Schema.Types.ObjectId, default: null },
  price: { type: Number, default: 0 },
  qty: { type: Number, default: 1 },
});

const supplierResponseSchema = new mongoose.Schema(
  {
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
    eta: { type: String, default: "" },
    remarks: { type: String, default: "" },
    deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryPartner", default: null },
    deliveryPartnerName: { type: String, default: "" },
    deliveryPartnerPhone: { type: String, default: "" },
    requestedFleetType: { type: String, default: "" },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    total: { type: Number, required: true },
    paymentMethod: { type: String, default: "card" },
    status: { type: String, enum: ["in_progress", "delivered", "cancelled"], default: "in_progress" },
    address: { type: String, default: "" },
    scheduledAt: Date,
    receiverName: String,
    receiverPhone: String,
    supplierResponses: [supplierResponseSchema],
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
