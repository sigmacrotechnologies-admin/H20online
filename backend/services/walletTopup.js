const Wallet = require("../models/Wallet");
const { getOrCreateWallet, getOrCreatePlatformWallet } = require("../routes/wallet");

function topupRef(razorpayPaymentId) {
  return `razorpay_topup_${razorpayPaymentId}`;
}

async function hasWalletTopupRef(razorpayPaymentId) {
  const ref = topupRef(razorpayPaymentId);
  const found = await Wallet.findOne({ "transactions.ref": ref }).select("_id").lean();
  return Boolean(found);
}

/**
 * Credit user wallet after verified Razorpay payment. Idempotent per payment id.
 */
async function creditWalletFromRazorpay(userId, amount, { razorpayPaymentId, razorpayOrderId }) {
  if (!razorpayPaymentId) {
    const err = new Error("Payment id required");
    err.statusCode = 400;
    throw err;
  }

  const creditAmount = Math.round(Number(amount));
  if (!Number.isFinite(creditAmount) || creditAmount < 1) {
    const err = new Error("Invalid top-up amount");
    err.statusCode = 400;
    throw err;
  }

  const ref = topupRef(razorpayPaymentId);
  const userWallet = await getOrCreateWallet(userId);
  const already = (userWallet.transactions || []).some((t) => t.ref === ref);
  if (already) {
    return {
      balance: userWallet.balance,
      credited: 0,
      alreadyCredited: true,
      razorpayPaymentId,
      razorpayOrderId: razorpayOrderId || "",
    };
  }

  if (await hasWalletTopupRef(razorpayPaymentId)) {
    const err = new Error("This payment was already used for a wallet top-up");
    err.statusCode = 409;
    throw err;
  }

  const platformWallet = await getOrCreatePlatformWallet();
  userWallet.balance = (userWallet.balance || 0) + creditAmount;
  userWallet.transactions = userWallet.transactions || [];
  userWallet.transactions.push({
    amount: creditAmount,
    type: "credit",
    ref,
    createdAt: new Date(),
  });
  platformWallet.balance = (platformWallet.balance || 0) + creditAmount;
  platformWallet.transactions = platformWallet.transactions || [];
  platformWallet.transactions.push({
    amount: creditAmount,
    type: "credit",
    ref: `platform_${ref}`,
    createdAt: new Date(),
  });

  await userWallet.save();
  await platformWallet.save();

  return {
    balance: userWallet.balance,
    credited: creditAmount,
    alreadyCredited: false,
    razorpayPaymentId,
    razorpayOrderId: razorpayOrderId || "",
  };
}

module.exports = {
  creditWalletFromRazorpay,
  topupRef,
  hasWalletTopupRef,
};
