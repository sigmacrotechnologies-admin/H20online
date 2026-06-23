import React, { useEffect, useRef, useState } from "react";
import { Modal, View, SafeAreaView, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { registerRazorpayCheckoutHost } from "@/src/utils/razorpayHostRegistry";

function buildCheckoutHtml({ keyId, orderId, amount, name, description, prefill }) {
  const payload = {
    key: keyId,
    amount: Number(amount) || 0,
    currency: "INR",
    name: name || "H2O Online",
    description: description || "Water order payment",
    order_id: orderId,
    theme: { color: "#33AFC1" },
    prefill: prefill || {},
  };
  const optionsJson = JSON.stringify(payload).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
</head>
<body style="margin:0;background:#f0f7fa;">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    function send(obj) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(obj));
    }
    function openCheckout() {
      if (typeof Razorpay === "undefined") {
        send({ type: "failed", message: "Could not load Razorpay checkout" });
        return;
      }
      var options = ${optionsJson};
      options.handler = function(r) { send({ type: "success", data: r }); };
      options.modal = { ondismiss: function() { send({ type: "cancel" }); } };
      var rzp = new Razorpay(options);
      rzp.on("payment.failed", function(resp) {
        send({ type: "failed", message: (resp && resp.error && resp.error.description) || "Payment failed" });
      });
      rzp.open();
    }
    if (document.readyState === "complete" || document.readyState === "interactive") openCheckout();
    else document.addEventListener("DOMContentLoaded", openCheckout);
  </script>
</body>
</html>`;
}

export function RazorpayCheckoutHost() {
  const [visible, setVisible] = useState(false);
  const [html, setHtml] = useState("");
  const callbackRef = useRef(null);
  const hostRef = useRef(null);

  useEffect(() => {
    const host = {
      open(opts, resolve, reject) {
        callbackRef.current = { resolve, reject };
        setHtml(buildCheckoutHtml(opts));
        setVisible(true);
      },
    };
    hostRef.current = host;
    registerRazorpayCheckoutHost(host);
    return () => {
      if (hostRef.current === host) registerRazorpayCheckoutHost(null);
    };
  }, []);

  const finish = (isResolve, value) => {
    setVisible(false);
    setHtml("");
    const cb = callbackRef.current;
    callbackRef.current = null;
    if (!cb) return;
    if (isResolve) cb.resolve(value);
    else cb.reject(value);
  };

  const onMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "success" && msg.data) {
        finish(true, {
          razorpay_payment_id: msg.data.razorpay_payment_id,
          razorpay_order_id: msg.data.razorpay_order_id,
          razorpay_signature: msg.data.razorpay_signature,
        });
      } else if (msg.type === "cancel") {
        finish(false, new Error("Payment cancelled"));
      } else if (msg.type === "failed") {
        finish(false, new Error(msg.message || "Payment failed"));
      }
    } catch (_) {}
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={() => finish(false, new Error("Payment cancelled"))}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Razorpay checkout</Text>
          <TouchableOpacity onPress={() => finish(false, new Error("Payment cancelled"))} hitSlop={12}>
            <Text style={styles.closeBtn}>Close</Text>
          </TouchableOpacity>
        </View>
        {html ? (
          <WebView
            originWhitelist={["*"]}
            source={{ html }}
            onMessage={onMessage}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator size="large" color="#33AFC1" />
              </View>
            )}
          />
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#1B2B34" },
  closeBtn: { fontSize: 15, color: "#0E7490", fontWeight: "600" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
