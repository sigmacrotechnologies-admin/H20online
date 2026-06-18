const WaterIntake = require("../models/WaterIntake");
const Order = require("../models/Order");
const Subscription = require("../models/Subscription");
const Wallet = require("../models/Wallet");

const GOAL_LITERS = 2.4;

function dateString(d) {
  const x = d instanceof Date ? d : new Date(d);
  return x.toISOString().slice(0, 10);
}

function buildSummaryFromDocs(docs, fromDate, toDate) {
  const byDate = {};
  for (let d = new Date(fromDate + "T12:00:00Z"); d <= new Date(toDate + "T12:00:00Z"); d.setDate(d.getDate() + 1)) {
    byDate[dateString(d)] = 0;
  }
  docs.forEach((doc) => {
    const total = (doc.entries || []).reduce((s, e) => s + (e.volumeMl || 0), 0);
    byDate[doc.date] = (byDate[doc.date] || 0) + total;
  });
  const days = Object.keys(byDate).sort();
  return days.map((date) => ({
    date,
    totalMl: byDate[date],
    totalLiters: Math.round((byDate[date] / 1000) * 10) / 10,
    dayOfWeek: new Date(date + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short" }),
  }));
}

async function getWaterSummary(userId, fromDate, toDate) {
  const docs = await WaterIntake.find({ userId, date: { $gte: fromDate, $lte: toDate } }).lean();
  return buildSummaryFromDocs(docs, fromDate, toDate);
}

async function getTodayIntake(userId, date) {
  const doc = await WaterIntake.findOne({ userId, date }).lean();
  const entries = doc?.entries || [];
  const totalMl = entries.reduce((s, e) => s + (e.volumeMl || 0), 0);
  const totalLiters = Math.round((totalMl / 1000) * 10) / 10;
  const pct = Math.min(100, Math.round((totalLiters / GOAL_LITERS) * 100));
  return {
    date,
    entries: entries.map((e) => ({
      type: e.type,
      quantity: e.quantity,
      volumeMl: e.volumeMl,
    })),
    totalMl,
    totalLiters,
    goalLiters: GOAL_LITERS,
    percentage: pct,
    remainingLiters: Math.max(0, Math.round((GOAL_LITERS - totalLiters) * 10) / 10),
  };
}

async function getOrdersSummary(userId) {
  const orders = await Order.find({ userId }).sort({ createdAt: -1 }).limit(10).lean();
  const active = orders.filter((o) => o.status && !["delivered", "cancelled"].includes(o.status));
  const delivered = orders.filter((o) => o.status === "delivered");
  return {
    recentCount: orders.length,
    activeCount: active.length,
    deliveredCount: delivered.length,
    lastOrder: orders[0]
      ? {
          status: orders[0].status,
          total: orders[0].total,
          productLabel: orders[0].productLabel,
          createdAt: orders[0].createdAt,
        }
      : null,
  };
}

async function getSubscriptionsSummary(userId) {
  const subs = await Subscription.find({ userId, status: { $ne: "cancelled" } }).lean();
  return {
    activeCount: subs.length,
    plans: subs.slice(0, 5).map((s) => ({
      planName: s.planName,
      productLabel: s.productLabel,
      frequency: s.frequency,
      totalPrice: s.totalPrice,
    })),
  };
}

async function getWalletSummary(userId) {
  const wallet = await Wallet.findOne({ userId }).lean();
  return {
    balance: Number(wallet?.balance || 0),
    transactionCount: (wallet?.transactions || []).length,
  };
}

async function buildDashboardContext(user) {
  const today = dateString(new Date());
  const from = (() => {
    const d = new Date(today + "T12:00:00Z");
    d.setDate(d.getDate() - 6);
    return dateString(d);
  })();

  const [summary, todayIntake, orders, subscriptions, wallet] = await Promise.all([
    getWaterSummary(user._id, from, today),
    getTodayIntake(user._id, today),
    getOrdersSummary(user._id),
    getSubscriptionsSummary(user._id),
    getWalletSummary(user._id),
  ]);

  const weekTotalLiters = summary.reduce((s, d) => s + d.totalLiters, 0);
  const avgDaily = summary.length ? Math.round((weekTotalLiters / summary.length) * 10) / 10 : 0;
  const weekendDays = summary.filter((d) => ["Sat", "Sun"].includes(d.dayOfWeek));
  const weekdayDays = summary.filter((d) => !["Sat", "Sun"].includes(d.dayOfWeek));
  const weekendAvg =
    weekendDays.length > 0
      ? Math.round((weekendDays.reduce((s, d) => s + d.totalLiters, 0) / weekendDays.length) * 10) / 10
      : 0;
  const weekdayAvg =
    weekdayDays.length > 0
      ? Math.round((weekdayDays.reduce((s, d) => s + d.totalLiters, 0) / weekdayDays.length) * 10) / 10
      : 0;

  return {
    userName: user.name || "User",
    period: { from, to: today },
    hydration: {
      today: todayIntake,
      last7Days: summary,
      weekTotalLiters: Math.round(weekTotalLiters * 10) / 10,
      avgDailyLiters: avgDaily,
      weekendAvgLiters: weekendAvg,
      weekdayAvgLiters: weekdayAvg,
      goalLiters: GOAL_LITERS,
    },
    orders,
    subscriptions,
    wallet,
  };
}

async function buildIntakeContext(user, selectedDate) {
  const date = selectedDate || dateString(new Date());
  const from = (() => {
    const d = new Date(date + "T12:00:00Z");
    d.setDate(d.getDate() - 6);
    return dateString(d);
  })();

  const [summary, dayIntake] = await Promise.all([
    getWaterSummary(user._id, from, date),
    getTodayIntake(user._id, date),
  ]);

  const weekTotal = summary.reduce((s, d) => s + d.totalLiters, 0);

  return {
    userName: user.name || "User",
    selectedDate: date,
    isToday: date === dateString(new Date()),
    dayIntake,
    last7Days: summary,
    weekTotalLiters: Math.round(weekTotal * 10) / 10,
    goalLiters: GOAL_LITERS,
  };
}

async function buildReportContext(user) {
  const dashboard = await buildDashboardContext(user);
  const allIntakeDocs = await WaterIntake.find({ userId: user._id })
    .sort({ date: -1 })
    .limit(14)
    .lean();

  const detailedEntries = allIntakeDocs.map((doc) => ({
    date: doc.date,
    entryCount: (doc.entries || []).length,
    totalLiters: Math.round(((doc.entries || []).reduce((s, e) => s + (e.volumeMl || 0), 0) / 1000) * 10) / 10,
    types: [...new Set((doc.entries || []).map((e) => e.type))],
  }));

  return {
    ...dashboard,
    detailedIntakeHistory: detailedEntries,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  buildDashboardContext,
  buildIntakeContext,
  buildReportContext,
};
