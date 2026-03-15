const mongoose = require("mongoose");

const planProductSchema = new mongoose.Schema(
  {
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
    productKey: { type: String, required: true, trim: true }, // 1l-bottle, 2l-bottle, 5l-bottle, 10l-jar, 20l-jar, 20l-can
    productLabel: { type: String, required: true, trim: true },
    priceDaily: { type: Number, required: true },
    priceWeekly: { type: Number, required: true },
    priceMonthly: { type: Number, required: true },
  },
  { timestamps: true }
);

planProductSchema.index({ planId: 1, productKey: 1 }, { unique: true });
module.exports = mongoose.model("PlanProduct", planProductSchema);
