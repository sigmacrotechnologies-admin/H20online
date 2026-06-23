const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Supplier = require("../models/Supplier");
const Store = require("../models/Store");
const Product = require("../models/Product");
const SavedAddress = require("../models/SavedAddress");
const DeliveryPartner = require("../models/DeliveryPartner");
const { auth } = require("../middleware/auth");
const { getOrCreateWallet, getOrCreatePlatformWallet } = require("./wallet");
const { travelInfoBatch } = require("../services/googleMaps");
const { etaFromTravelInfo } = require("../utils/deliveryEta");

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
    const body = req.body;
    const items = body.items;
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "Items required" });
    const orderItems = items.map((i) => ({
      productId: toObjectId(i.id || i.productId),
      productName: i.productName || "",
      supplierName: i.supplierName || "",
      supplierId: toObjectId(i.supplierId),
      storeId: toObjectId(i.storeId),
      storeName: i.storeName || "",
      price: Number(i.price) || 0,
      qty: Number(i.qty) || 1,
    }));
    const orderTotal = typeof body.total === "number" ? body.total : orderItems.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
    const qtyByProductId = new Map();
    for (const it of orderItems) {
      const key = it.productId ? String(it.productId) : "";
      if (!key) continue;
      qtyByProductId.set(key, (qtyByProductId.get(key) || 0) + (Number(it.qty) || 1));
    }
    const stockDocs = [];
    if (qtyByProductId.size > 0) {
      const ids = Array.from(qtyByProductId.keys()).filter((id) => mongoose.Types.ObjectId.isValid(id));
      const products = await Product.find({ _id: { $in: ids } });
      for (const p of products) {
        const needed = qtyByProductId.get(String(p._id)) || 0;
        const available = Number(p.stockQty || 0);
        if (needed > available) {
          return res.status(400).json({ error: `Insufficient stock for ${p.productName || "product"}. Available: ${available}` });
        }
      }
      for (const p of products) {
        const needed = qtyByProductId.get(String(p._id)) || 0;
        if (needed > 0) {
          p.stockQty = Math.max(0, Number(p.stockQty || 0) - needed);
          p.inStock = p.stockQty > 0;
          stockDocs.push({ id: p._id.toString(), deducted: needed });
          await p.save();
        }
      }
    }
    const paymentMethod = body.paymentMethod || "card";
    let didWalletDebit = false;
    if (paymentMethod === "wallet") {
      const userWallet = await getOrCreateWallet(req.user._id);
      if (userWallet.balance < orderTotal) return res.status(400).json({ error: "Insufficient wallet balance" });
      const platformWallet = await getOrCreatePlatformWallet();
      userWallet.balance -= orderTotal;
      userWallet.transactions = userWallet.transactions || [];
      userWallet.transactions.push({ amount: orderTotal, type: "debit", ref: "order" });
      await userWallet.save();
      platformWallet.balance += orderTotal;
      platformWallet.transactions = platformWallet.transactions || [];
      platformWallet.transactions.push({ amount: orderTotal, type: "credit", ref: "order" });
      await platformWallet.save();
      didWalletDebit = true;
    }
    const uniqueSupplierIds = [...new Set(orderItems.map((i) => i.supplierId).filter(Boolean))];
    const supplierResponses = uniqueSupplierIds.map((sid) => ({ supplierId: sid, status: "pending" }));
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    const orderType = scheduledAt ? "scheduled" : "instant";
    const orderChannel = body.orderChannel === "society" ? "society" : "customer";
    const customerLatitude =
      body.customerLatitude != null && Number.isFinite(Number(body.customerLatitude))
        ? Number(body.customerLatitude)
        : undefined;
    const customerLongitude =
      body.customerLongitude != null && Number.isFinite(Number(body.customerLongitude))
        ? Number(body.customerLongitude)
        : undefined;

    let travelInfo = [];
    if (customerLatitude != null && customerLongitude != null) {
      try {
        const storeIds = [...new Set(orderItems.map((i) => i.storeId).filter(Boolean))];
        if (storeIds.length > 0) {
          const stores = await Store.find({ _id: { $in: storeIds }, status: "approved" }).lean();
          const destinations = stores
            .filter((s) => s.latitude != null && s.longitude != null)
            .map((s) => ({
              id: s._id.toString(),
              lat: s.latitude,
              lng: s.longitude,
              name: s.name || "",
            }));
          const batch = await travelInfoBatch(customerLatitude, customerLongitude, destinations);
          travelInfo = Object.entries(batch).map(([storeId, info]) => {
            const store = stores.find((s) => s._id.toString() === storeId);
            const item = orderItems.find((it) => String(it.storeId) === storeId);
            return {
              storeId,
              storeName: store?.name || info.supplierName || item?.storeName || "",
              supplierId: item?.supplierId || store?.supplierId,
              supplierName: item?.supplierName || "",
              distanceText: info.distanceText || "",
              distanceMeters: info.distanceMeters || 0,
              durationText: info.durationText || "",
              durationSeconds: info.durationSeconds || 0,
              storeLatitude: info.storeLatitude,
              storeLongitude: info.storeLongitude,
            };
          });
        }
      } catch (travelErr) {
        console.warn("Travel info skipped:", travelErr.message);
      }
    }

    const etaBand = etaFromTravelInfo(travelInfo, 0);

    let order;
    try {
      order = await Order.create({
        userId: req.user._id,
        items: orderItems,
        total: orderTotal,
        paymentMethod,
        address: body.address || "",
        orderType,
        receiverName: body.receiverName || null,
        receiverPhone: body.receiverPhone || null,
        scheduledAt,
        supplierResponses,
        orderChannel,
        customerLatitude,
        customerLongitude,
        travelInfo,
        estimatedDeliveryMinMinutes: etaBand.min,
        estimatedDeliveryMaxMinutes: etaBand.max,
        estimatedDeliveryText: etaBand.text,
      });
    } catch (createErr) {
      if (stockDocs.length > 0) {
        for (const s of stockDocs) {
          try {
            const p = await Product.findById(s.id);
            if (!p) continue;
            p.stockQty = Math.max(0, Number(p.stockQty || 0) + Number(s.deducted || 0));
            p.inStock = p.stockQty > 0;
            await p.save();
          } catch (_) {}
        }
      }
      if (didWalletDebit) {
        const userWallet = await getOrCreateWallet(req.user._id);
        const platformWallet = await getOrCreatePlatformWallet();
        userWallet.balance += orderTotal;
        userWallet.transactions.push({ amount: orderTotal, type: "credit", ref: "order_refund" });
        await userWallet.save();
        platformWallet.balance -= orderTotal;
        platformWallet.transactions.push({ amount: orderTotal, type: "debit", ref: "order_refund" });
        await platformWallet.save();
      }
      throw createErr;
    }
    const out = order.toObject();
    // Auto-save checkout address (with phone) for future selections.
    try {
      const addrText = String(body.address || "").trim();
      const phoneText = String(body.receiverPhone || "").trim();
      if (addrText && phoneText) {
        const existing = await SavedAddress.findOne({
          userId: req.user._id,
          fullAddress: addrText,
          phoneNumber: phoneText,
        }).lean();
        if (!existing) {
          await SavedAddress.create({
            userId: req.user._id,
            fullAddress: addrText,
            phoneNumber: phoneText,
            houseNumber: "",
            locality: "",
            city: "",
            state: "",
            pinCode: "",
            isDefault: false,
          });
        }
      }
    } catch (_) {
      // Non-blocking: order is already created successfully.
    }
    res.status(201).json({
      id: out._id.toString(),
      orderId: out.orderId || out._id.toString(),
      items: out.items,
      total: out.total,
      status: out.status,
      date: out.createdAt,
      address: out.address,
      orderType: out.orderType || "instant",
      scheduledAt: out.scheduledAt || null,
      customerLatitude: out.customerLatitude ?? null,
      customerLongitude: out.customerLongitude ?? null,
      travelInfo: out.travelInfo || [],
      paymentMethod: out.paymentMethod || paymentMethod,
      estimatedDeliveryText: out.estimatedDeliveryText || etaBand.text,
      estimatedDeliveryMinMinutes: out.estimatedDeliveryMinMinutes ?? etaBand.min,
      estimatedDeliveryMaxMinutes: out.estimatedDeliveryMaxMinutes ?? etaBand.max,
    });
    console.log("Order created:", out._id.toString());
  } catch (err) {
    console.error("Order error:", err.message);
    res.status(500).json({ error: err.message });
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
