import { Platform } from "react-native";

let impl;
if (Platform.OS === "web") {
  impl = require("./razorpayCheckout.web");
} else {
  impl = require("./razorpayCheckout.native");
}

export const openRazorpayCheckout = impl.openRazorpayCheckout;
