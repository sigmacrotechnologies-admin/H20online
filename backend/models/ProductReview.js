const mongoose = require("mongoose");

const productReviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },

    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
  },
  { timestamps: true }
);

// One review per user per order item (product).
productReviewSchema.index({ userId: 1, orderId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model("ProductReview", productReviewSchema);

