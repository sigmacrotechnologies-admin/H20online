const mongoose = require("mongoose");
const Order = require("../models/Order");
const Store = require("../models/Store");
const Product = require("../models/Product");
const SavedAddress = require("../models/SavedAddress");
const { getOrCreateWallet, getOrCreatePlatformWallet } = require("../routes/wallet");
const { travelInfoBatch } = require("./googleMaps");
const { etaFromTravelInfo } = require("../utils/deliveryEta");
const { getTaxSettings, validateOrderBilling, roundRupee } = require("./taxSettings");
const { checkServiceability, normalizePin } = require("./serviceableArea");
const { isRazorpayTestMode } = require("./razorpay");

function toObjectId(v) {
  if (v == null || v === "") return null;
  if (typeof v === "string" && mongoose.Types.ObjectId.isValid(v) && v.length === 24) return v;
  return null;
}

function formatOrderResponse(order, paymentMethod, etaBand) {
  const out = order.toObject();
  return {
    id: out._id.toString(),
    orderId: out.orderId || out._id.toString(),
    items: out.items,
    subtotal: out.subtotal ?? out.total,
    taxLines: out.taxLines || [],
    taxTotal: out.taxTotal ?? 0,
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
    estimatedDeliveryText: out.estimatedDeliveryText || etaBand?.text || "",
    estimatedDeliveryMinMinutes: out.estimatedDeliveryMinMinutes ?? etaBand?.min ?? 0,
    estimatedDeliveryMaxMinutes: out.estimatedDeliveryMaxMinutes ?? etaBand?.max ?? 0,
  };
}

async function createCustomerOrder(user, body, options = {}) {
  const items = body.items;
  if (!items || !Array.isArray(items) || items.length === 0) {
    const err = new Error("Items required");
    err.statusCode = 400;
    throw err;
  }

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

  const itemsSubtotal = orderItems.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
  const taxSettings = await getTaxSettings();
  const billingCheck = validateOrderBilling(itemsSubtotal, body, taxSettings);
  if (!billingCheck.ok) {
    const err = new Error(billingCheck.error);
    err.statusCode = 400;
    throw err;
  }
  const billing = billingCheck.billing;
  const orderTotal = billing.grandTotal;

  const supplierIds = [...new Set(orderItems.map((i) => i.supplierId).filter(Boolean).map(String))];
  const orderPin = normalizePin(body.pinCode) || normalizePin((body.address || "").match(/\b(\d{6})\b/)?.[1]);
  if (!orderPin || orderPin.length < 6) {
    const err = new Error("Valid 6-digit PIN code is required for delivery");
    err.statusCode = 400;
    throw err;
  }

  const serviceCheck = await checkServiceability({
    pinCode: orderPin,
    latitude: body.customerLatitude,
    longitude: body.customerLongitude,
    city: body.city,
    state: body.state,
    supplierIds,
  });
  if (!serviceCheck.serviceable) {
    const blocked = serviceCheck.unserviceableSupplierIds
      .map((id) => serviceCheck.suppliers[id]?.supplierName || "Supplier")
      .filter(Boolean);
    const err = new Error(
      blocked.length
        ? `This address is not within the availability range for: ${blocked.join(", ")}.`
        : serviceCheck.error || "This address is not within the supplier's availability range."
    );
    err.statusCode = 400;
    throw err;
  }

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
        const err = new Error(`Insufficient stock for ${p.productName || "product"}. Available: ${available}`);
        err.statusCode = 400;
        throw err;
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

  const paymentMethod = options.paymentMethod || body.paymentMethod || "card";
  let didWalletDebit = false;

  if (paymentMethod === "wallet") {
    const userWallet = await getOrCreateWallet(user._id);
    if (userWallet.balance < orderTotal) {
      const err = new Error("Insufficient wallet balance");
      err.statusCode = 400;
      throw err;
    }
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

  const paymentStatus =
    paymentMethod === "cod" ? "pending" : paymentMethod === "razorpay" ? "paid" : paymentMethod === "wallet" ? "paid" : "paid";
  const razorpayTestMode =
    paymentMethod === "razorpay" && (body.razorpayTestMode === true || isRazorpayTestMode());

  let order;
  try {
    order = await Order.create({
      userId: user._id,
      items: orderItems,
      subtotal: billing.subtotal,
      taxLines: billing.taxLines,
      taxTotal: billing.taxTotal,
      total: orderTotal,
      paymentMethod,
      paymentStatus,
      razorpayOrderId: body.razorpayOrderId || options.razorpayOrderId || null,
      razorpayPaymentId: body.razorpayPaymentId || options.razorpayPaymentId || null,
      razorpayTestMode,
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
      const userWallet = await getOrCreateWallet(user._id);
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

  try {
    const addrText = String(body.address || "").trim();
    const phoneText = String(body.receiverPhone || "").trim();
    if (addrText && phoneText) {
      const existing = await SavedAddress.findOne({
        userId: user._id,
        fullAddress: addrText,
        phoneNumber: phoneText,
      }).lean();
      if (!existing) {
        await SavedAddress.create({
          userId: user._id,
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
    // Non-blocking
  }

  return formatOrderResponse(order, paymentMethod, etaBand);
}

module.exports = {
  createCustomerOrder,
  formatOrderResponse,
  toObjectId,
};
