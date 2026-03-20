const express = require("express");
const mongoose = require("mongoose");
const { auth } = require("../middleware/auth");

const ProductReview = require("../models/ProductReview");
const Order = require("../models/Order");
const Product = require("../models/Product");

const router = express.Router();

function toObjectId(v) {
  if (v == null || v === "") return null;
  if (typeof v === "string" && mongoose.Types.ObjectId.isValid(v)) return v;
  return null;
}

async function recomputeProductRating(productId) {
  const productObjectId = toObjectId(productId);
  if (!productObjectId) return;

  const agg = await ProductReview.aggregate([
    { $match: { productId: productObjectId } },
    {
      $group: {
        _id: "$productId",
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const row = agg[0];
  const avg = row?.avgRating;
  const count = row?.count || 0;

  await Product.findByIdAndUpdate(productObjectId, {
    rating: typeof avg === "number" ? Number(avg.toFixed(1)) : 4,
    reviewCount: String(count),
  });
}

router.post("/", auth, async (req, res) => {
  try {
    const { orderId, productId, rating, comment } = req.body || {};
    const orderMongoId = toObjectId(orderId);
    const productMongoId = toObjectId(productId);

    const ratingNum = Number(rating);
    if (!orderMongoId || !productMongoId) return res.status(400).json({ error: "orderId and productId are required" });
    if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) return res.status(400).json({ error: "rating must be between 1 and 5" });

    const order = await Order.findOne({ _id: orderMongoId, userId: req.user._id }).lean();
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "delivered") return res.status(400).json({ error: "You can rate only after delivery" });

    const inOrder = (order.items || []).some((i) => String(i.productId) === String(productMongoId));
    if (!inOrder) return res.status(400).json({ error: "This product is not in the order" });

    const updated = await ProductReview.findOneAndUpdate(
      { userId: req.user._id, orderId: orderMongoId, productId: productMongoId },
      {
        $set: {
          userId: req.user._id,
          orderId: orderMongoId,
          productId: productMongoId,
          rating: ratingNum,
          comment: typeof comment === "string" ? comment.trim() : "",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    await recomputeProductRating(productMongoId);

    res.status(201).json({ ...updated, id: updated._id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/product/:productId", async (req, res) => {
  try {
    const productMongoId = toObjectId(req.params.productId);
    if (!productMongoId) return res.status(400).json({ error: "Invalid productId" });

    const reviews = await ProductReview.find({ productId: productMongoId })
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.json(
      reviews.map((r) => ({
        id: r._id.toString(),
        rating: r.rating,
        comment: r.comment || "",
        userName: r.userId?.name || "Customer",
        createdAt: r.createdAt,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/me/order/:orderId", auth, async (req, res) => {
  try {
    const orderMongoId = toObjectId(req.params.orderId);
    if (!orderMongoId) return res.status(400).json({ error: "Invalid orderId" });

    const order = await Order.findOne({ _id: orderMongoId, userId: req.user._id }).lean();
    if (!order) return res.status(404).json({ error: "Order not found" });

    const reviews = await ProductReview.find({ userId: req.user._id, orderId: orderMongoId }).lean();

    res.json(
      reviews.map((r) => ({
        id: r._id.toString(),
        productId: r.productId?.toString?.() || r.productId,
        rating: r.rating,
        comment: r.comment || "",
        createdAt: r.createdAt,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

