const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Supplier = require("../models/Supplier");
const Store = require("../models/Store");
const DeliveryPartner = require("../models/DeliveryPartner");
const { auth } = require("../middleware/auth");
const { etaFromTravelInfo } = require("../utils/deliveryEta");
const { createCustomerOrder } = require("../services/customerOrderService");

const router = express.Router();
router.use(auth);

async function findUserOrder(userId, idParam) {
  if (!idParam) return null;
  const oid = toObjectId(idParam);
  if (oid) {
    const byId = await Order.findOne({ _id: oid, userId }).lean();
    if (byId) return byId;
  }
  const key = String(idParam);
  if (key.startsWith("ORD_")) {
    return await Order.findOne({ orderId: key, userId }).lean();
  }
  return null;
}

function orderEtaFields(o) {
  const accepted = (o.supplierResponses || []).find((r) => r && r.status === "accepted");
  const text =
    accepted?.eta ||
    o.estimatedDeliveryText ||
    "";
  return {
    estimatedDeliveryText: text,
    estimatedDeliveryMinMinutes: o.estimatedDeliveryMinMinutes ?? 0,
    estimatedDeliveryMaxMinutes: o.estimatedDeliveryMaxMinutes ?? 0,
  };
}

function toObjectId(v) {
  if (v == null || v === "") return null;
  if (typeof v === "string" && mongoose.Types.ObjectId.isValid(v) && v.length === 24) return v;
  return null;
}

router.get("/", async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    for (const o of orders) {
      if (!o.orderId) {
        const orderId = await Order.generateUniqueOrderId();
        await Order.updateOne({ _id: o._id }, { $set: { orderId } });
        o.orderId = orderId;
      }
    }

    // Prefetch supplier contact details to support "Track order" screen without extra fetch.
    const supplierIds = [...new Set((orders || []).flatMap((o) => (o.items || []).map((i) => i.supplierId && i.supplierId.toString()).filter(Boolean)))];
    let supplierById = {};
    if (supplierIds.length > 0) {
      const suppliers = await Supplier.find({ _id: { $in: supplierIds } }).lean();
      supplierById = suppliers.reduce((acc, s) => {
        acc[s._id.toString()] = {
          id: s._id.toString(),
          name: s.name || s.contactPerson || "",
          phone: s.phone || "",
          rating: typeof s.rating === "number" ? s.rating : 0,
        };
        return acc;
      }, {});
    }

    const list = orders.map((o) => {
      const acceptedResp = (o.supplierResponses || []).find((r) => r && r.status === "accepted");
      const supplierIdForContact =
        (acceptedResp && acceptedResp.supplierId && acceptedResp.supplierId.toString && acceptedResp.supplierId.toString()) ||
        (o.items || []).map((i) => i.supplierId && i.supplierId.toString()).filter(Boolean)[0] ||
        null;
      const supplier = supplierIdForContact ? supplierById[supplierIdForContact] || null : null;

      return {
        id: o._id.toString(),
        orderId: o.orderId || o._id.toString(),
        items: o.items,
        total: o.total,
        paymentMethod: o.paymentMethod,
        status: o.status,
        orderType: o.orderType || "instant",
        scheduledAt: o.scheduledAt || null,
        date: o.createdAt,
        address: o.address,
        orderChannel: o.orderChannel || "customer",
        supplierResponses: o.supplierResponses || [],
        supplier,
        customerLatitude: o.customerLatitude ?? null,
        customerLongitude: o.customerLongitude ?? null,
        travelInfo: o.travelInfo || [],
        paymentMethod: o.paymentMethod || "",
        ...orderEtaFields(o),
      };
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/tracking", async (req, res) => {
  try {
    const o = await findUserOrder(req.user._id, req.params.id);
    if (!o) return res.status(404).json({ error: "Order not found" });

    const accepted = (o.supplierResponses || []).find((r) => r && r.status === "accepted");
    const stage = accepted?.deliveryStage || (accepted ? "accepted" : "placed");
    const hasPartner = !!(accepted?.deliveryPartnerId || accepted?.deliveryPartnerName);
    const isDelivered = o.status === "delivered" || stage === "delivered";
    const liveTrackingActive =
      o.status === "in_progress" && !isDelivered && hasPartner;

    let partnerLat = accepted?.partnerLatitude ?? null;
    let partnerLng = accepted?.partnerLongitude ?? null;
    let partnerLocationUpdatedAt = accepted?.partnerLocationUpdatedAt ?? null;

    if (
      liveTrackingActive &&
      accepted?.deliveryPartnerId &&
      (partnerLat == null || partnerLng == null)
    ) {
      const dp = await DeliveryPartner.findById(accepted.deliveryPartnerId)
        .select("lastLatitude lastLongitude locationUpdatedAt")
        .lean();
      if (dp?.lastLatitude != null && dp?.lastLongitude != null) {
        partnerLat = dp.lastLatitude;
        partnerLng = dp.lastLongitude;
        partnerLocationUpdatedAt = dp.locationUpdatedAt ?? partnerLocationUpdatedAt;
      }
    }

    res.json({
      id: o._id.toString(),
      orderId: o.orderId,
      status: o.status,
      deliveryStage: stage,
      supplierAccepted: !!accepted,
      partnerAssigned: hasPartner,
      liveTrackingActive,
      address: o.address || "",
      customerLatitude: o.customerLatitude ?? null,
      customerLongitude: o.customerLongitude ?? null,
      partnerLatitude: partnerLat,
      partnerLongitude: partnerLng,
      partnerLocationUpdatedAt: partnerLocationUpdatedAt,
      partnerName: accepted?.deliveryPartnerName || "",
      partnerPhone: accepted?.deliveryPartnerPhone || "",
      liveEtaText: accepted?.liveEtaText || "",
      liveEtaSeconds: accepted?.liveEtaSeconds ?? 0,
      liveDistanceText: accepted?.liveDistanceText || "",
      travelInfo: o.travelInfo || [],
      ...orderEtaFields(o),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    let o = await findUserOrder(req.user._id, req.params.id);
    if (!o) return res.status(404).json({ error: "Order not found" });
    if (!o.orderId) {
      const orderId = await Order.generateUniqueOrderId();
      await Order.updateOne({ _id: o._id }, { $set: { orderId } });
      o = { ...o, orderId };
    }

    const supplierIds = [...new Set((o.items || []).map((i) => i.supplierId && i.supplierId.toString()).filter(Boolean))];
    let primarySupplier = null;
    // Prefer the supplier that accepted the order (so the customer sees correct contact details).
    const acceptedResp = (o.supplierResponses || []).find((r) => r && r.status === "accepted");
    const supplierIdForContact = acceptedResp?.supplierId?.toString?.() || (supplierIds.length > 0 ? supplierIds[0] : null);
    if (supplierIdForContact) {
      const s = await Supplier.findById(supplierIdForContact).lean();
      if (s) {
        primarySupplier = {
          id: s._id.toString(),
          name: s.name || s.contactPerson || "",
          phone: s.phone || "",
          rating: typeof s.rating === "number" ? s.rating : 0,
        };
      }
    }

    res.json({
      id: o._id.toString(),
      orderId: o.orderId,
      items: o.items,
      total: o.total,
      status: o.status,
      orderType: o.orderType || "instant",
      scheduledAt: o.scheduledAt || null,
      date: o.createdAt,
      address: o.address,
      receiverName: o.receiverName,
      receiverPhone: o.receiverPhone,
      supplierResponses: o.supplierResponses || [],
      supplier: primarySupplier,
      customerLatitude: o.customerLatitude ?? null,
      customerLongitude: o.customerLongitude ?? null,
      travelInfo: o.travelInfo || [],
      paymentMethod: o.paymentMethod || "",
      ...orderEtaFields(o),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const paymentMethod = req.body.paymentMethod || "card";
    if (paymentMethod === "razorpay") {
      return res.status(400).json({ error: "Use Razorpay verify-payment endpoint after checkout" });
    }
    const result = await createCustomerOrder(req.user, req.body, { paymentMethod });
    res.status(201).json(result);
    console.log("Order created:", result.id);
  } catch (err) {
    const status = err.statusCode || 500;
    console.error("Order error:", err.message);
    res.status(status).json({ error: err.message });
  }
});

router.patch("/:id/cancel", async (req, res) => {
  try {
    const o = await findUserOrder(req.user._id, req.params.id);
    if (!o) return res.status(404).json({ error: "Order not found" });
    const order = await Order.findById(o._id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "in_progress") return res.status(400).json({ error: "Cannot cancel" });
    order.status = "cancelled";
    await order.save();
    res.json({ id: order._id.toString(), status: order.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
