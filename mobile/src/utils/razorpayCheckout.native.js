import Constants from "expo-constants";
import { openRazorpayWebViewCheckout } from "@/src/utils/razorpayHostRegistry";

function isExpoGo() {
  return Constants.appOwnership === "expo";
}

function tryNativeRazorpay() {
  if (isExpoGo()) return null;
  try {
    return require("react-native-razorpay").default;
  } catch {
    return null;
  }
}

export async function openRazorpayCheckout({ keyId, orderId, amount, name, description, prefill }) {
  if (!keyId) throw new Error("Razorpay key not configured");
  if (!orderId) throw new Error("Missing Razorpay order id");

  const RazorpayCheckout = tryNativeRazorpay();

  if (RazorpayCheckout) {
    const options = {
      key: keyId,
      amount: String(amount),
      currency: "INR",
      name: name || "H2O Online",
      description: description || "Water order payment",
      order_id: orderId,
      theme: { color: "#33AFC1" },
      prefill: prefill || {},
    };

    try {
      const data = await RazorpayCheckout.open(options);
      return {
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_order_id: data.razorpay_order_id || orderId,
        razorpay_signature: data.razorpay_signature,
      };
    } catch (err) {
      const code = err?.code || err?.error?.code;
      const desc = err?.description || err?.error?.description || err?.message;
      if (code === "BAD_REQUEST_ERROR" && /cancel/i.test(String(desc))) {
        throw new Error("Payment cancelled");
      }
      if (/cancel/i.test(String(desc))) {
        throw new Error("Payment cancelled");
      }
      throw new Error(desc || "Payment failed");
    }
  }

  return openRazorpayWebViewCheckout({ keyId, orderId, amount, name, description, prefill });
}
