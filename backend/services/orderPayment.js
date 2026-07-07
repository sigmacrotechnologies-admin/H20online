const PAYMENT_METHOD_LABELS = {
  razorpay: "Razorpay",
  wallet: "H2O Wallet",
  cod: "Cash on Delivery",
  card: "Card",
};

const RAZORPAY_METHOD_LABELS = {
  upi: "UPI",
  card: "Card",
  netbanking: "Net Banking",
  wallet: "Wallet",
  emi: "EMI",
  paylater: "Pay Later",
};

function getOrderSourceLabel(order) {
  const channel = order.orderChannel === "society" ? "Society portal" : "Customer app";
  const platform = order.orderPlatform === "web" ? "Web" : "Mobile app";
  return `${channel} · ${platform}`;
}

function formatPaymentBlock(order) {
  const method = order.paymentMethod || "";
  const isRazorpay = method === "razorpay";
  return {
    method,
    methodLabel: PAYMENT_METHOD_LABELS[method] || method || "—",
    status: order.paymentStatus || "",
    gateway: isRazorpay ? "Razorpay" : method === "wallet" ? "H2O Wallet" : method === "cod" ? "COD" : method || "—",
    paidAt: order.paidAt || (order.paymentStatus === "paid" ? order.createdAt : null),
    orderChannel: order.orderChannel || "customer",
    orderPlatform: order.orderPlatform || "mobile",
    orderSource: getOrderSourceLabel(order),
    razorpay: isRazorpay
      ? {
          orderId: order.razorpayOrderId || "",
          paymentId: order.razorpayPaymentId || "",
          method: order.razorpayPaymentMethod || "",
          methodLabel: order.razorpayPaymentMethodLabel || "",
          methodDetail: order.razorpayPaymentMethodDetail || "",
          vpa: order.razorpayVpa || "",
          bank: order.razorpayBank || "",
          status: order.razorpayPaymentStatus || "",
          email: order.razorpayEmail || "",
          contact: order.razorpayContact || "",
          fee: order.razorpayFee ?? null,
          tax: order.razorpayTax ?? null,
          testMode: order.razorpayTestMode === true,
        }
      : null,
  };
}

function parseRazorpayPaymentDetails(payment) {
  if (!payment) return null;
  const method = payment.method || "";
  let methodDetail = "";
  if (method === "upi") {
    methodDetail = payment.vpa || "";
  } else if (method === "card") {
    const card = payment.card || {};
    methodDetail = [card.network, card.type ? `${card.type} card` : "", card.last4 ? `****${card.last4}` : ""]
      .filter(Boolean)
      .join(" ");
  } else if (method === "netbanking") {
    methodDetail = payment.bank || "";
  } else if (method === "wallet") {
    methodDetail = payment.wallet || "";
  }

  return {
    razorpayPaymentMethod: method,
    razorpayPaymentMethodLabel: RAZORPAY_METHOD_LABELS[method] || method || "Razorpay",
    razorpayPaymentMethodDetail: methodDetail,
    razorpayBank: payment.bank || "",
    razorpayVpa: payment.vpa || "",
    razorpayPaymentStatus: payment.status || "",
    razorpayFee: payment.fee != null ? Number(payment.fee) / 100 : null,
    razorpayTax: payment.tax != null ? Number(payment.tax) / 100 : null,
    paidAt: payment.created_at ? new Date(payment.created_at * 1000) : new Date(),
    razorpayEmail: payment.email || "",
    razorpayContact: payment.contact || "",
  };
}

function isHumanOrderId(value) {
  const key = String(value || "");
  return key.startsWith("H2O-") || key.startsWith("ORD_");
}

module.exports = {
  formatPaymentBlock,
  parseRazorpayPaymentDetails,
  getOrderSourceLabel,
  isHumanOrderId,
  PAYMENT_METHOD_LABELS,
};
