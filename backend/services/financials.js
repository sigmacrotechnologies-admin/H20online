const Order = require("../models/Order");
const Supplier = require("../models/Supplier");
const Wallet = require("../models/Wallet");
const { isRazorpayConfigured, isRazorpayTestMode } = require("./razorpay");

const DELIVERY_SHARE_PERCENT = 10;
const DEFAULT_COMMISSION_PERCENT = 20;

function roundRupee(n) {
  return Math.round(Number(n) || 0);
}

function supplierItemsSubtotal(order, supplierId) {
  return (order.items || [])
    .filter((i) => i.supplierId && String(i.supplierId) === String(supplierId))
    .reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
}

function isRazorpayPaidOrder(o) {
  return o.paymentMethod === "razorpay" && o.paymentStatus === "paid" && o.razorpayPaymentId;
}

function isOrderRazorpayTest(o) {
  if (o.razorpayTestMode === true) return true;
  if (o.razorpayTestMode === false) return false;
  return isRazorpayTestMode();
}

function computeOrderSettlement(order, supplierMap) {
  const orderTotal = Number(order.total) || 0;
  const deliveryShare = roundRupee(orderTotal * (DELIVERY_SHARE_PERCENT / 100));

  const supplierIds = [...new Set((order.items || []).map((i) => i.supplierId).filter(Boolean))];
  const suppliers = [];
  let supplierPayoutTotal = 0;
  let platformCutFromSuppliers = 0;

  for (const sid of supplierIds) {
    const gross = supplierItemsSubtotal(order, sid);
    const supplier = supplierMap.get(String(sid));
    const commission = Math.min(100, Math.max(0, Number(supplier?.commissionPercentage) || DEFAULT_COMMISSION_PERCENT));
    const platformCut = roundRupee(gross * (commission / 100));
    const payout = roundRupee(gross * (1 - commission / 100));
    supplierPayoutTotal += payout;
    platformCutFromSuppliers += platformCut;
    suppliers.push({
      supplierId: String(sid),
      supplierName: supplier?.name || (order.items || []).find((i) => String(i.supplierId) === String(sid))?.supplierName || "",
      gross,
      commissionPercent: commission,
      platformCut,
      payout,
    });
  }

  const platformRetention = orderTotal - supplierPayoutTotal - deliveryShare;

  return {
    id: order._id ? String(order._id) : "",
    orderId: order.orderId || (order._id ? String(order._id) : ""),
    orderTotal,
    paymentMethod: order.paymentMethod || "",
    paymentStatus: order.paymentStatus || "",
    status: order.status || "",
    delivered: order.status === "delivered",
    deliveryShare,
    deliverySharePercent: DELIVERY_SHARE_PERCENT,
    supplierPayoutTotal,
    platformCutFromSuppliers,
    platformRetention,
    suppliers,
    createdAt: order.createdAt,
    isRazorpayTest: isRazorpayPaidOrder(order) ? isOrderRazorpayTest(order) : false,
  };
}

async function loadSupplierMapForOrders(orders) {
  const ids = new Set();
  for (const o of orders) {
    for (const i of o.items || []) {
      if (i.supplierId) ids.add(String(i.supplierId));
    }
  }
  const suppliers = await Supplier.find({ _id: { $in: [...ids] } }).lean();
  const map = new Map();
  for (const s of suppliers) map.set(String(s._id), s);
  return map;
}

function classifyPlatformTransaction(t) {
  const ref = String(t.ref || "");
  if (t.type === "credit") {
    if (ref === "order") return { category: "wallet_order", label: "Wallet order payment" };
    if (ref.startsWith("bill_")) return { category: "subscription_bill", label: "Subscription bill" };
    return { category: "other_credit", label: ref || "Credit" };
  }
  if (ref.startsWith("order_") && ref !== "order_refund") return { category: "order_payout", label: `Payout · ${ref.replace("order_", "")}` };
  if (ref === "order_refund") return { category: "refund", label: "Order refund" };
  return { category: "other_debit", label: ref || "Debit" };
}

function classifyUserCreditTransaction(t) {
  const ref = String(t.ref || "");
  if (ref.startsWith("supplier_payout")) return { category: "supplier_payout", label: ref };
  if (ref.startsWith("delivery")) return { category: "rider_payout", label: ref };
  return { category: "other", label: ref };
}

function sumUserWalletPayouts(wallets) {
  let amountToSuppliers = 0;
  let amountToRiders = 0;
  for (const uw of wallets) {
    for (const t of uw.transactions || []) {
      if (t.type !== "credit") continue;
      const ref = String(t.ref || "");
      if (ref.startsWith("supplier_payout")) amountToSuppliers += Number(t.amount) || 0;
      else if (ref.startsWith("delivery")) amountToRiders += Number(t.amount) || 0;
    }
  }
  return { amountToSuppliers, amountToRiders };
}

async function getAdminFinancials() {
  const orders = await Order.find({ status: { $ne: "cancelled" } }).lean();
  const supplierMap = await loadSupplierMapForOrders(orders);

  let totalOrderRevenue = 0;
  let walletOrderRevenue = 0;
  let razorpayRevenue = 0;
  let razorpayLiveRevenue = 0;
  let razorpayTestRevenue = 0;
  let razorpayOrderCount = 0;
  let razorpayTestOrderCount = 0;
  let codPendingRevenue = 0;

  let platformCutTotal = 0;
  let supplierPayoutEstimated = 0;
  let riderPayoutEstimated = 0;
  let platformRetentionEstimated = 0;

  const byDay = {};

  for (const o of orders) {
    const settlement = computeOrderSettlement(o, supplierMap);
    const dateStr = o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : "";
    if (!byDay[dateStr]) {
      byDay[dateStr] = {
        revenue: 0,
        platformCut: 0,
        supplierPayout: 0,
        riderPayout: 0,
        platformRetention: 0,
        orderCount: 0,
        razorpayRevenue: 0,
      };
    }

    totalOrderRevenue += settlement.orderTotal;
    byDay[dateStr].revenue += settlement.orderTotal;
    byDay[dateStr].orderCount += 1;
    platformCutTotal += settlement.platformCutFromSuppliers;
    supplierPayoutEstimated += settlement.supplierPayoutTotal;
    riderPayoutEstimated += settlement.deliveryShare;
    platformRetentionEstimated += settlement.platformRetention;
    byDay[dateStr].platformCut += settlement.platformCutFromSuppliers;
    byDay[dateStr].supplierPayout += settlement.supplierPayoutTotal;
    byDay[dateStr].riderPayout += settlement.deliveryShare;
    byDay[dateStr].platformRetention += settlement.platformRetention;

    if (o.paymentMethod === "wallet") walletOrderRevenue += settlement.orderTotal;
    if (isRazorpayPaidOrder(o)) {
      razorpayRevenue += settlement.orderTotal;
      razorpayOrderCount += 1;
      byDay[dateStr].razorpayRevenue += settlement.orderTotal;
      if (isOrderRazorpayTest(o)) {
        razorpayTestRevenue += settlement.orderTotal;
        razorpayTestOrderCount += 1;
      } else {
        razorpayLiveRevenue += settlement.orderTotal;
      }
    }
    if (o.paymentMethod === "cod" && o.paymentStatus !== "paid") codPendingRevenue += settlement.orderTotal;
  }

  const sortedDays = Object.entries(byDay)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 30)
    .map(([date, data]) => ({ date, ...data }));

  const deliveredOrders = orders.filter((o) => o.status === "delivered");
  const recentSettlements = deliveredOrders
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 40)
    .map((o) => computeOrderSettlement(o, supplierMap));

  const razorpayOrders = await Order.find({
    paymentMethod: "razorpay",
    paymentStatus: "paid",
    razorpayPaymentId: { $ne: null },
    status: { $ne: "cancelled" },
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("userId", "name email phone")
    .lean();

  const recentRazorpayPayments = razorpayOrders.map((o) => ({
    orderId: o.orderId || o._id.toString(),
    id: o._id.toString(),
    total: o.total,
    date: o.createdAt,
    razorpayPaymentId: o.razorpayPaymentId,
    razorpayOrderId: o.razorpayOrderId,
    isTest: isOrderRazorpayTest(o),
    status: o.status,
    customerName: o.userId?.name || "",
    customerEmail: o.userId?.email || "",
  }));

  const platformWallet = await Wallet.findOne({ ownerType: "platform" }).lean();
  const platformTx = (platformWallet && platformWallet.transactions) || [];

  let walletOrderCredits = 0;
  let billCredits = 0;
  let otherCredits = 0;
  let payoutDebits = 0;
  let refundDebits = 0;
  let otherDebits = 0;

  const recentPlatformTransactions = platformTx
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 80)
    .map((t) => {
      const info = classifyPlatformTransaction(t);
      const amount = Number(t.amount) || 0;
      if (t.type === "credit") {
        if (info.category === "wallet_order") walletOrderCredits += amount;
        else if (info.category === "subscription_bill") billCredits += amount;
        else otherCredits += amount;
      } else if (info.category === "order_payout") payoutDebits += amount;
      else if (info.category === "refund") refundDebits += amount;
      else otherDebits += amount;
      return {
        amount,
        type: t.type,
        ref: t.ref || "",
        category: info.category,
        label: info.label,
        createdAt: t.createdAt,
      };
    });

  const walletCreditsTotal = walletOrderCredits + billCredits + otherCredits;
  const walletDebitsTotal = payoutDebits + refundDebits + otherDebits;

  const allUserWallets = await Wallet.find({ ownerType: "user" }).lean();
  const { amountToSuppliers, amountToRiders } = sumUserWalletPayouts(allUserWallets);
  const totalPayouts = amountToSuppliers + amountToRiders;
  const settledRevenue = walletOrderCredits + billCredits + razorpayRevenue;
  const netWalletFlow = walletCreditsTotal - walletDebitsTotal;

  return {
    rates: {
      deliverySharePercent: DELIVERY_SHARE_PERCENT,
      defaultCommissionPercent: DEFAULT_COMMISSION_PERCENT,
      note: "Supplier fee uses each supplier's commission %. Rider share is 10% of order total (incl. tax).",
    },
    totalOrderRevenue,
    totalRevenue: totalOrderRevenue,
    walletOrderRevenue,
    billRevenue: billCredits,
    razorpayRevenue,
    razorpayLiveRevenue,
    razorpayTestRevenue,
    razorpayOrderCount,
    razorpayTestOrderCount,
    razorpayLiveOrderCount: razorpayOrderCount - razorpayTestOrderCount,
    codPendingRevenue,
    settledRevenue,
    platformCutTotal,
    platformCutPercent: totalOrderRevenue > 0 ? (platformCutTotal / totalOrderRevenue) * 100 : 0,
    supplierPayoutEstimated,
    riderPayoutEstimated,
    platformRetentionEstimated,
    walletRevenue: walletCreditsTotal,
    walletOrderCredits,
    amountToSuppliers,
    amountToRiders,
    amountToDeliveryPartners: amountToRiders,
    totalPayouts,
    walletDebitsTotal,
    payoutDebits,
    refundDebits,
    netWalletFlow,
    netProfit: netWalletFlow,
    platformWalletBalance: platformWallet ? platformWallet.balance : 0,
    orderCount: orders.length,
    deliveredOrderCount: deliveredOrders.length,
    byDay: sortedDays,
    recentSettlements,
    recentPlatformTransactions,
    recentRazorpayPayments,
    razorpayConfigured: isRazorpayConfigured(),
    razorpayCurrentTestMode: isRazorpayTestMode(),
  };
}

async function getSupplierFinancials(supplier) {
  const supplierId = supplier._id;
  const orders = await Order.find({
    "items.supplierId": supplierId,
    status: { $ne: "cancelled" },
  }).lean();

  const commission = Math.min(100, Math.max(0, Number(supplier.commissionPercentage) || DEFAULT_COMMISSION_PERCENT));
  let totalRevenue = 0;
  let platformDeduction = 0;
  let netEarnings = 0;
  let walletPayoutTotal = 0;

  const supplierUserWallet = await Wallet.findOne({ userId: supplier.userId }).lean();
  for (const t of supplierUserWallet?.transactions || []) {
    if (t.type === "credit" && String(t.ref || "").startsWith("supplier_payout")) {
      walletPayoutTotal += Number(t.amount) || 0;
    }
  }

  for (const o of orders) {
    const gross = supplierItemsSubtotal(o, supplierId);
    totalRevenue += gross;
    const cut = roundRupee(gross * (commission / 100));
    platformDeduction += cut;
    netEarnings += roundRupee(gross * (1 - commission / 100));
  }

  const bonusAmount = Number(supplier.bonusAmount || 0);
  netEarnings += bonusAmount;

  return {
    totalRevenue,
    platformDeductionPercent: commission,
    platformDeduction,
    netEarnings,
    walletPayoutTotal,
    orderCount: orders.length,
    bonusAmount,
    bonusLabel: supplier.bonusLabel || "H2O Online extra benefit",
  };
}

async function getDeliveryPartnerFinancials(dpId, userId) {
  const orders = await Order.find({
    "supplierResponses.deliveryPartnerId": dpId,
    status: "delivered",
  }).lean();

  let deliveryShareEstimated = 0;
  for (const o of orders) {
    deliveryShareEstimated += roundRupee((Number(o.total) || 0) * (DELIVERY_SHARE_PERCENT / 100));
  }

  const wallet = await Wallet.findOne({ userId }).lean();
  let walletEarnings = 0;
  const recentTransactions = [];
  for (const t of wallet?.transactions || []) {
    if (t.type === "credit" && String(t.ref || "").startsWith("delivery")) {
      walletEarnings += Number(t.amount) || 0;
      recentTransactions.push({
        amount: t.amount,
        type: t.type,
        ref: t.ref || "",
        createdAt: t.createdAt,
      });
    }
  }

  recentTransactions.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  return {
    totalDeliveries: orders.length,
    deliveryShareEstimated,
    deliveryShare: walletEarnings,
    walletEarnings,
    walletBalance: wallet?.balance || 0,
    deliverySharePercent: DELIVERY_SHARE_PERCENT,
    currency: "INR",
    recentTransactions: recentTransactions.slice(0, 30),
  };
}

module.exports = {
  DELIVERY_SHARE_PERCENT,
  DEFAULT_COMMISSION_PERCENT,
  roundRupee,
  supplierItemsSubtotal,
  computeOrderSettlement,
  loadSupplierMapForOrders,
  classifyPlatformTransaction,
  classifyUserCreditTransaction,
  getAdminFinancials,
  getSupplierFinancials,
  getDeliveryPartnerFinancials,
  isRazorpayPaidOrder,
  isOrderRazorpayTest,
};
