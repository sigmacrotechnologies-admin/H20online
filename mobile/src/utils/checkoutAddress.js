/** Map a saved address API object to checkout form + cart checkout details fields */
export function addressToCheckoutFields(address) {
  if (!address) return null;
  return {
    addressId: address.id || null,
    address: address.fullAddress || "",
    pinCode: address.pinCode || "",
    city: address.city || "",
    state: address.state || "",
    receiverPhone: address.phoneNumber || "",
    customerLatitude: address.latitude ?? null,
    customerLongitude: address.longitude ?? null,
  };
}

export function normalizePin(pin) {
  const digits = String(pin || "").replace(/\D/g, "");
  return digits.length >= 6 ? digits.slice(0, 6) : digits;
}
