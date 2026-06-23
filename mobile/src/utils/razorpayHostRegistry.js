let checkoutHost = null;

export function registerRazorpayCheckoutHost(host) {
  checkoutHost = host;
}

export function openRazorpayWebViewCheckout(opts) {
  return new Promise((resolve, reject) => {
    if (!checkoutHost) {
      reject(new Error("Payment UI not ready. Open the payment screen and try again."));
      return;
    }
    checkoutHost.open(opts, resolve, reject);
  });
}
