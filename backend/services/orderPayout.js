const Order = require("../models/Order");
const Supplier = require("../models/Supplier");
const { getOrCreateWallet, getOrCreatePlatformWallet } = require("../routes/wallet");

const DELIVERY_SHARE_PERCENT = 10; // 10% of order total to delivery partner

/**
 * When order is delivered and was paid by wallet: credit supplier(s) and delivery partner, debit platform.
 * Only runs when order.paymentMethod === "wallet".
 */
async function runPayoutOnDelivered(order, deliveryPartnerUserId) {
  if (!order || order.paymentMethod !== "wallet") return;
  const orderId = order._id.toString();
  const orderTotal = order.total || 0;
  const deliveryShare = Math.round(orderTotal * (DELIVERY_SHARE_PERCENT / 100));

  const supplierIds = [...new Set((order.items || []).map((i) => i.supplierId).filter(Boolean))];
  const supplierPayouts = [];
  for (const sid of supplierIds) {
    const supplier = await Supplier.findById(sid).lean();
    if (!supplier || !supplier.userId) continue;
    const itemsForSupplier = (order.items || []).filter((i) => i.supplierId && String(i.supplierId) === String(sid));
    const supplierTotal = itemsForSupplier.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
    const commission = Math.min(100, Math.max(0, Number(supplier.commissionPercentage) || 20));
    const payout = Math.round(supplierTotal * (1 - commission / 100));
    if (payout > 0) supplierPayouts.push({ userId: supplier.userId, amount: payout });
  }

  const totalPayout = supplierPayouts.reduce((s, p) => s + p.amount, 0) + deliveryShare;
  const platformWallet = await getOrCreatePlatformWallet();
  if (platformWallet.balance < totalPayout) return; // safety: don't go negative
  platformWallet.balance -= totalPayout;
  platformWallet.transactions = platformWallet.transactions || [];
  platformWallet.transactions.push({ amount: totalPayout, type: "debit", ref: `order_${orderId}` });
  await platformWallet.save();

  for (const { userId, amount } of supplierPayouts) {
    const w = await getOrCreateWallet(userId);
    w.balance = (w.balance || 0) + amount;
    w.transactions = w.transactions || [];
    w.transactions.push({ amount, type: "credit", ref: `supplier_payout_${orderId}` });
    await w.save();
  }

  if (deliveryShare > 0 && deliveryPartnerUserId) {
    const dpWallet = await getOrCreateWallet(deliveryPartnerUserId);
    dpWallet.balance = (dpWallet.balance || 0) + deliveryShare;
    dpWallet.transactions = dpWallet.transactions || [];
    dpWallet.transactions.push({ amount: deliveryShare, type: "credit", ref: `delivery_${orderId}` });
    await dpWallet.save();
  }
}

module.exports = { runPayoutOnDelivered, DELIVERY_SHARE_PERCENT };
