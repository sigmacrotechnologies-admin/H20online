import PaymentScreen from "@/src/screens/PaymentScreen";
import { RazorpayCheckoutHost } from "@/src/components/RazorpayCheckoutHost";

export default function PaymentRoute() {
  return (
    <>
      <RazorpayCheckoutHost />
      <PaymentScreen />
    </>
  );
}
