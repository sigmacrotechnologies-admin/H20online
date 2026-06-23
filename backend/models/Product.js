const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true, trim: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", default: null },
    productType: { type: String, default: "jar", trim: true },
    imageUrl: { type: String, default: "", trim: true },
    price: { type: Number, required: true },
    priceUnit: { type: String, default: "20L Jar" },
    delivery: { type: String, default: "20-30 min" },
    inStock: { type: Boolean, default: true },
    stockQty: { type: Number, default: 0 },
    capacityL: { type: Number, default: 20 },
    categories: [{ type: String }],
    badge: { type: String, enum: ["subscription", "premium", ""], default: "" },
    audience: { type: String, enum: ["customer", "society"], default: "customer" },
    waterQuality: {
      type: String,
      enum: ["standard", "purified", "ro", "mineral", ""],
      default: "",
    },
    rating: { type: Number, default: 4 },
    reviewCount: { type: String, default: "0" },
  },
  { timestamps: true }
);

productSchema.index({ productName: "text" });
productSchema.index({ capacityL: 1, categories: 1 });

module.exports = mongoose.model("Product", productSchema);
