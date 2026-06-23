const Order = require("../models/Order");

/**
 * Partner IDs with an active delivery (assigned, not yet delivered).
 */
async function getInFlightPartnerIds() {
  const orders = await Order.find({
    status: "in_progress",
    supplierResponses: {
      $elemMatch: {
        deliveryPartnerId: { $exists: true, $ne: null },
        status: "accepted",
        deliveryStage: { $in: ["accepted", "picked_up"] },
      },
    },
  })
    .select("supplierResponses")
    .lean();

  const ids = new Set();
  for (const o of orders) {
    for (const r of o.supplierResponses || []) {
      if (
        r.deliveryPartnerId &&
        r.status === "accepted" &&
        r.deliveryStage !== "delivered"
      ) {
        ids.add(String(r.deliveryPartnerId));
      }
    }
  }
  return ids;
}

async function isPartnerInFlight(dpId) {
  const ids = await getInFlightPartnerIds();
  return ids.has(String(dpId));
}

async function getActiveDeliveryForPartner(dpId) {
  const order = await Order.findOne({
    status: "in_progress",
    supplierResponses: {
      $elemMatch: {
        deliveryPartnerId: dpId,
        status: "accepted",
        deliveryStage: { $in: ["accepted", "picked_up"] },
      },
    },
  })
    .select("_id supplierResponses")
    .lean();

  if (!order) return null;

  const resp = (order.supplierResponses || []).find(
    (r) =>
      String(r.deliveryPartnerId) === String(dpId) &&
      r.status === "accepted" &&
      r.deliveryStage !== "delivered"
  );

  if (!resp) return null;

  return {
    orderId: order._id.toString(),
    deliveryStage: resp.deliveryStage || "accepted",
  };
}

function isPartnerAssignable(dp, inFlightIds) {
  if (!dp) return false;
  if (inFlightIds.has(String(dp._id))) return false;
  return Boolean(dp.isOnline);
}

function partnerAssignmentError(dp, inFlightIds) {
  if (!dp) return "Delivery partner not found or not available to this supplier";
  if (inFlightIds.has(String(dp._id))) {
    return "This delivery partner is in flight and cannot be assigned until the current order is delivered";
  }
  if (!dp.isOnline) {
    return "Delivery partner must be online to receive new assignments";
  }
  return null;
}

module.exports = {
  getInFlightPartnerIds,
  isPartnerInFlight,
  getActiveDeliveryForPartner,
  isPartnerAssignable,
  partnerAssignmentError,
};
