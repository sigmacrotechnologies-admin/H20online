const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
  productName: { type: String, default: "" },
  supplierName: { type: String, default: "" },
  supplierId: { type: mongoose.Schema.Types.ObjectId, default: null },
  storeId: { type: mongoose.Schema.Types.ObjectId, default: null },
  storeName: { type: String, default: "" },
  price: { type: Number, default: 0 },
  qty: { type: Number, default: 1 },
});

const supplierResponseSchema = new mongoose.Schema(
  {
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
    deliveryStage: { type: String, enum: ["accepted", "picked_up", "delivered"], default: "accepted" },
    eta: { type: String, default: "" },
    etaBufferMinutes: { type: Number, default: 0 },
    remarks: { type: String, default: "" },
    deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryPartner", default: null },
    deliveryPartnerName: { type: String, default: "" },
    deliveryPartnerPhone: { type: String, default: "" },
    requestedFleetType: { type: String, default: "" },
    partnerLatitude: { type: Number },
    partnerLongitude: { type: Number },
    partnerLocationUpdatedAt: { type: Date },
    liveEtaText: { type: String, default: "" },
    liveEtaSeconds: { type: Number, default: 0 },
    liveDistanceText: { type: String, default: "" },
    liveDistanceMeters: { type: Number, default: 0 },
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
    orderType: { type: String, enum: ["instant", "scheduled"], default: "instant" },
    scheduledAt: Date,
    receiverName: String,
    receiverPhone: String,
    supplierResponses: [supplierResponseSchema],
    orderChannel: { type: String, enum: ["customer", "society"], default: "customer" },
    customerLatitude: { type: Number },
    customerLongitude: { type: Number },
    estimatedDeliveryMinMinutes: { type: Number, default: 0 },
    estimatedDeliveryMaxMinutes: { type: Number, default: 0 },
    estimatedDeliveryText: { type: String, default: "" },
    travelInfo: [
      {
        supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
        storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
        supplierName: { type: String, default: "" },
        storeName: { type: String, default: "" },
        distanceText: { type: String, default: "" },
        distanceMeters: { type: Number, default: 0 },
        durationText: { type: String, default: "" },
        durationSeconds: { type: Number, default: 0 },
        storeLatitude: { type: Number },
        storeLongitude: { type: Number },
      },
    ],
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
