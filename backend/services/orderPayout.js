const Wallet = require("../models/Wallet");
const { getOrCreateWallet, getOrCreatePlatformWallet } = require("../routes/wallet");
const {
  loadSupplierMapForOrders,
  computeOrderSettlement,
  DELIVERY_SHARE_PERCENT,
} = require("./financials");

async function orderPayoutAlreadyDone(orderId) {
  const sid = String(orderId);
  const platformWallet = await Wallet.findOne({ ownerType: "platform" }).lean();
  if (
    platformWallet?.transactions?.some(
      (t) => t.type === "debit" && String(t.ref || "") === `order_${sid}`
    )
  ) {
    return true;
  }
  const userPayout = await Wallet.findOne({
    transactions: {
      $elemMatch: {
        $or: [{ ref: `supplier_payout_${sid}` }, { ref: `delivery_${sid}` }],
      },
    },
  }).lean();
  return Boolean(userPayout);
}

/**
 * On delivery: credit supplier(s) and rider wallets. Debit platform wallet only for wallet-paid orders.
 */
async function runPayoutOnDelivered(order, deliveryPartnerUserId) {
  if (!order || order.status !== "delivered") return;

  const orderId = order._id.toString();
  if (await orderPayoutAlreadyDone(orderId)) return;

  const supplierMap = await loadSupplierMapForOrders([order]);
  const settlement = computeOrderSettlement(order, supplierMap);
  const debitPlatform = order.paymentMethod === "wallet";

  const platformWallet = await getOrCreatePlatformWallet();
  const totalPayout = settlement.supplierPayoutTotal + settlement.deliveryShare;

  if (debitPlatform && platformWallet.balance < totalPayout) return;

  if (debitPlatform && totalPayout > 0) {
    platformWallet.balance -= totalPayout;
    platformWallet.transactions = platformWallet.transactions || [];
    platformWallet.transactions.push({
      amount: totalPayout,
      type: "debit",
      ref: `order_${orderId}`,
    });
    await platformWallet.save();
  }

  for (const s of settlement.suppliers) {
    if (s.payout <= 0) continue;
    const supplier = supplierMap.get(s.supplierId);
    if (!supplier?.userId) continue;
    const w = await getOrCreateWallet(supplier.userId);
    w.balance = (w.balance || 0) + s.payout;
    w.transactions = w.transactions || [];
    w.transactions.push({
      amount: s.payout,
      type: "credit",
      ref: `supplier_payout_${orderId}`,
    });
    await w.save();
  }

  if (settlement.deliveryShare > 0 && deliveryPartnerUserId) {
    const dpWallet = await getOrCreateWallet(deliveryPartnerUserId);
    dpWallet.balance = (dpWallet.balance || 0) + settlement.deliveryShare;
    dpWallet.transactions = dpWallet.transactions || [];
    dpWallet.transactions.push({
      amount: settlement.deliveryShare,
      type: "credit",
      ref: `delivery_${orderId}`,
    });
    await dpWallet.save();
  }
}

module.exports = { runPayoutOnDelivered, DELIVERY_SHARE_PERCENT, orderPayoutAlreadyDone };
