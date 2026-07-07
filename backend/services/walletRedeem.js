const WalletRedeemRequest = require("../models/WalletRedeemRequest");
const Supplier = require("../models/Supplier");
const { getOrCreateWallet } = require("../routes/wallet");

const MIN_REDEEM_AMOUNT = 1;

function formatRequest(doc, extras = {}) {
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: d._id.toString(),
    userId: d.userId ? String(d.userId) : null,
    supplierId: d.supplierId ? String(d.supplierId) : null,
    amount: d.amount,
    accountHolderName: d.accountHolderName,
    bankAccountNumber: d.bankAccountNumber || "",
    ifscCode: d.ifscCode || "",
    upiId: d.upiId || "",
    status: d.status,
    adminNote: d.adminNote || "",
    reviewedAt: d.reviewedAt || null,
    walletDebitRef: d.walletDebitRef || "",
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    ...extras,
  };
}

function validatePayoutDetails(body) {
  const accountHolderName = String(body.accountHolderName || "").trim();
  const bankAccountNumber = String(body.bankAccountNumber || "").trim();
  const ifscCode = String(body.ifscCode || "").trim().toUpperCase();
  const upiId = String(body.upiId || "").trim();

  if (!accountHolderName) {
    return { ok: false, error: "Account holder name is required" };
  }
  const hasBank = bankAccountNumber.length >= 8 && ifscCode.length >= 8;
  const hasUpi = upiId.length >= 3;
  if (!hasBank && !hasUpi) {
    return {
      ok: false,
      error: "Provide bank account + IFSC, or a UPI ID (or both)",
    };
  }
  return {
    ok: true,
    accountHolderName,
    bankAccountNumber,
    ifscCode,
    upiId,
  };
}

async function getPendingRedeemTotal(userId) {
  const rows = await WalletRedeemRequest.find({ userId, status: "pending" }).select("amount").lean();
  return rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
}

async function createRedeemRequest(user, body) {
  if (user.role !== "supplier") {
    const err = new Error("Only suppliers can request wallet redemption");
    err.statusCode = 403;
    throw err;
  }

  const supplier = await Supplier.findOne({ userId: user._id }).lean();
  if (!supplier) {
    const err = new Error("Supplier profile required");
    err.statusCode = 403;
    throw err;
  }

  const amount = Math.round(Number(body.amount));
  if (!Number.isFinite(amount) || amount < MIN_REDEEM_AMOUNT) {
    const err = new Error(`Minimum redeem amount is ₹${MIN_REDEEM_AMOUNT}`);
    err.statusCode = 400;
    throw err;
  }

  const payout = validatePayoutDetails(body);
  if (!payout.ok) {
    const err = new Error(payout.error);
    err.statusCode = 400;
    throw err;
  }

  const wallet = await getOrCreateWallet(user._id);
  const pendingTotal = await getPendingRedeemTotal(user._id);
  const available = (wallet.balance || 0) - pendingTotal;
  if (amount > available) {
    const err = new Error(
      pendingTotal > 0
        ? `Insufficient available balance. ₹${pendingTotal} is reserved in pending redeem requests.`
        : "Insufficient wallet balance"
    );
    err.statusCode = 400;
    throw err;
  }

  const reqDoc = await WalletRedeemRequest.create({
    userId: user._id,
    supplierId: supplier._id,
    amount,
    accountHolderName: payout.accountHolderName,
    bankAccountNumber: payout.bankAccountNumber,
    ifscCode: payout.ifscCode,
    upiId: payout.upiId,
    status: "pending",
  });

  return formatRequest(reqDoc, {
    walletBalance: wallet.balance,
    pendingRedeemTotal: pendingTotal + amount,
    availableBalance: available - amount,
  });
}

async function listRedeemRequestsForUser(userId, { limit = 30 } = {}) {
  const list = await WalletRedeemRequest.find({ userId })
    .sort({ createdAt: -1 })
    .limit(Math.min(100, Math.max(1, limit)))
    .lean();
  return list.map((d) => formatRequest(d));
}

async function listRedeemRequestsAdmin({ status, page = 1, limit = 20, search } = {}) {
  const filter = {};
  if (status && ["pending", "approved", "rejected"].includes(status)) {
    filter.status = status;
  }

  const skip = (Math.max(1, Number(page)) - 1) * Math.min(50, Math.max(1, Number(limit)));
  const limitNum = Math.min(50, Math.max(1, Number(limit)));

  let list = await WalletRedeemRequest.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .populate("userId", "name email phone userCode")
    .populate("supplierId", "name contactPerson email phone")
    .lean();

  if (search && String(search).trim()) {
    const s = String(search).trim().toLowerCase();
    list = list.filter((r) => {
      const u = r.userId || {};
      const sup = r.supplierId || {};
      return (
        String(u.name || "").toLowerCase().includes(s) ||
        String(u.email || "").toLowerCase().includes(s) ||
        String(sup.name || "").toLowerCase().includes(s) ||
        String(r.upiId || "").toLowerCase().includes(s) ||
        String(r.bankAccountNumber || "").includes(s)
      );
    });
  }

  const total = await WalletRedeemRequest.countDocuments(filter);

  return {
    requests: list.map((d) =>
      formatRequest(d, {
        supplierName: d.supplierId?.name || d.supplierId?.contactPerson || "",
        userName: d.userId?.name || "",
        userEmail: d.userId?.email || "",
        userPhone: d.userId?.phone || "",
        userCode: d.userId?.userCode || "",
      })
    ),
    total,
    page: Number(page) || 1,
    limit: limitNum,
  };
}

async function approveRedeemRequest(requestId, adminUser, adminNote = "") {
  const reqDoc = await WalletRedeemRequest.findOne({ _id: requestId, status: "pending" });
  if (!reqDoc) {
    const err = new Error("Pending redeem request not found");
    err.statusCode = 404;
    throw err;
  }

  const wallet = await getOrCreateWallet(reqDoc.userId);
  const pendingOthers = await WalletRedeemRequest.find({
    userId: reqDoc.userId,
    status: "pending",
    _id: { $ne: reqDoc._id },
  })
    .select("amount")
    .lean();
  const pendingOtherTotal = pendingOthers.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const available = (wallet.balance || 0) - pendingOtherTotal;

  if (reqDoc.amount > available) {
    const err = new Error("Insufficient wallet balance to approve this request");
    err.statusCode = 400;
    throw err;
  }

  const debitRef = `redeem_request_${reqDoc._id.toString()}`;
  wallet.balance = (wallet.balance || 0) - reqDoc.amount;
  wallet.transactions = wallet.transactions || [];
  wallet.transactions.push({
    amount: reqDoc.amount,
    type: "debit",
    ref: debitRef,
    createdAt: new Date(),
  });
  await wallet.save();

  reqDoc.status = "approved";
  reqDoc.reviewedBy = adminUser._id || null;
  reqDoc.reviewedAt = new Date();
  reqDoc.walletDebitRef = debitRef;
  if (adminNote) reqDoc.adminNote = String(adminNote).trim();
  await reqDoc.save();

  return formatRequest(reqDoc, { walletBalance: wallet.balance });
}

async function rejectRedeemRequest(requestId, adminUser, adminNote = "") {
  const reqDoc = await WalletRedeemRequest.findOne({ _id: requestId, status: "pending" });
  if (!reqDoc) {
    const err = new Error("Pending redeem request not found");
    err.statusCode = 404;
    throw err;
  }

  reqDoc.status = "rejected";
  reqDoc.reviewedBy = adminUser._id || null;
  reqDoc.reviewedAt = new Date();
  if (adminNote) reqDoc.adminNote = String(adminNote).trim();
  await reqDoc.save();

  return formatRequest(reqDoc);
}

async function getRedeemPrefill(userId) {
  const supplier = await Supplier.findOne({ userId }).lean();
  const wallet = await getOrCreateWallet(userId);
  const pendingTotal = await getPendingRedeemTotal(userId);
  return {
    walletBalance: wallet.balance || 0,
    pendingRedeemTotal: pendingTotal,
    availableBalance: Math.max(0, (wallet.balance || 0) - pendingTotal),
    accountHolderName: supplier?.contactPerson || supplier?.name || "",
    bankAccountNumber: supplier?.bankAccount || "",
    ifscCode: supplier?.ifscCode || "",
    upiId: "",
  };
}

module.exports = {
  createRedeemRequest,
  listRedeemRequestsForUser,
  listRedeemRequestsAdmin,
  approveRedeemRequest,
  rejectRedeemRequest,
  getRedeemPrefill,
  getPendingRedeemTotal,
};
