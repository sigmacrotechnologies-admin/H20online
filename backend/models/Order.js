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
    deliveryStage: { type: String, enum: ["accepted", "picked_up", "delivered"], default: "accepted" },
    eta: { type: String, default: "" },
    remarks: { type: String, default: "" },
    deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryPartner", default: null },
    deliveryPartnerName: { type: String, default: "" },
    deliveryPartnerPhone: { type: String, default: "" },
    requestedFleetType: { type: String, default: "" },
  },
  { _id: false }
);

function randomOrderIdSuffix(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, trim: true, unique: true, sparse: true }, // ORD_XXXXXXXX
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
orderSchema.index({ orderId: 1 });

orderSchema.statics.generateUniqueOrderId = async function () {
  let id;
  let exists = true;
  while (exists) {
    id = "ORD_" + randomOrderIdSuffix(8);
    exists = await this.exists({ orderId: id });
  }
  return id;
};

orderSchema.pre("save", async function () {
  if (!this.orderId) {
    this.orderId = await this.constructor.generateUniqueOrderId();
  }
});

module.exports = mongoose.model("Order", orderSchema);
