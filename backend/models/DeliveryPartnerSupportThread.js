const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    from: { type: String, required: true, enum: ["delivery_partner", "admin"] },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const threadSchema = new mongoose.Schema(
  {
    deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryPartner", required: true },
    messages: [messageSchema],
  },
  { timestamps: true }
);

threadSchema.index({ deliveryPartnerId: 1 });
module.exports = mongoose.model("DeliveryPartnerSupportThread", threadSchema);
