const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    from: { type: String, required: true, enum: ["supplier", "admin"] },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const threadSchema = new mongoose.Schema(
  {
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    messages: [messageSchema],
  },
  { timestamps: true }
);

threadSchema.index({ supplierId: 1 });
module.exports = mongoose.model("SupplierSupportThread", threadSchema);
