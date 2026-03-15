require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const DeliveryPartner = require("../models/DeliveryPartner");

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/h20online";

const samples = [
  { name: "Rahul Rider", email: "rahul.dp@h2o.test", phone: "9876543210", vehicleType: "bicycle" },
  { name: "Vikram Bike", email: "vikram.dp@h2o.test", phone: "9876543211", vehicleType: "bike" },
  { name: "Suresh Van", email: "suresh.dp@h2o.test", phone: "9876543212", vehicleType: "minivan" },
  { name: "Amit Truck", email: "amit.dp@h2o.test", phone: "9876543213", vehicleType: "truck" },
  { name: "Priya Cycle", email: "priya.dp@h2o.test", phone: "9876543214", vehicleType: "cycle" },
  { name: "Deepak Camper", email: "deepak.dp@h2o.test", phone: "9876543215", vehicleType: "camper" },
  { name: "Anita Bike", email: "anita.dp@h2o.test", phone: "9876543216", vehicleType: "bike" },
  { name: "Rohan Bicycle", email: "rohan.dp@h2o.test", phone: "9876543217", vehicleType: "bicycle" },
];

const PASSWORD = "delivery123";

async function seed() {
  await mongoose.connect(uri);
  console.log("Connected to", uri);
  for (const s of samples) {
    const existing = await User.findOne({ email: s.email });
    if (existing) {
      const dp = await DeliveryPartner.findOne({ userId: existing._id });
      if (dp) {
        dp.onboardingStatus = "approved";
        dp.documentLicenseVerified = true;
        dp.documentIdentityVerified = true;
        await dp.save();
        console.log("Updated DP:", s.email);
        continue;
      }
    }
    if (!existing) {
      const user = await User.create({
        name: s.name,
        email: s.email,
        phone: s.phone,
        password: PASSWORD,
        role: "deliveryPartner",
      });
      const dp = await DeliveryPartner.create({
        name: s.name,
        email: s.email,
        phone: s.phone,
        vehicleType: s.vehicleType,
        userId: user._id,
        onboardingStatus: "approved",
        documentLicenseVerified: true,
        documentIdentityVerified: true,
      });
      console.log("Created DP:", s.email, s.vehicleType);
    }
  }
  console.log("Seed delivery partners done. Password for all: " + PASSWORD);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
