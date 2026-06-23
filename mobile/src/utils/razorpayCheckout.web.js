function loadCheckoutScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("Web checkout unavailable"));
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-razorpay-checkout="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay")));
      if (window.Razorpay) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpayCheckout = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout"));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout({ keyId, orderId, amount, name, description, prefill }) {
  if (!keyId) throw new Error("Razorpay key not configured");
  if (!orderId) throw new Error("Missing Razorpay order id");

  await loadCheckoutScript();

  return new Promise((resolve, reject) => {
    const options = {
      key: keyId,
      amount: Number(amount),
      currency: "INR",
      name: name || "H2O Online",
      description: description || "Water order payment",
      order_id: orderId,
      theme: { color: "#33AFC1" },
      prefill: prefill || {},
      handler: (response) => {
        resolve({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id || orderId,
          razorpay_signature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled")),
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (response) => {
      const desc = response?.error?.description || response?.error?.reason || "Payment failed";
      reject(new Error(desc));
    });
    rzp.open();
  });
}
