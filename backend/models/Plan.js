const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true }, // basic, family, active, premium
    maxQuantityPerProduct: { type: Number, default: 5 }, // basic: 5, family: high number
    comingSoon: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plan", planSchema);
