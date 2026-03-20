require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const DeliveryPartner = require("../models/DeliveryPartner");

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/h20online";

const samples = [
  { name: "Rahul Rider", email: "rahul.dp@h2o.test", phone: "9876543210", vehicleType: "bicycle", vehicleNumber: "MH 01 AB 1001" },
  { name: "Vikram Bike", email: "vikram.dp@h2o.test", phone: "9876543211", vehicleType: "bike", vehicleNumber: "MH 02 CD 2002" },
  { name: "Suresh Van", email: "suresh.dp@h2o.test", phone: "9876543212", vehicleType: "van", vehicleNumber: "MH 03 EF 3003" },
  { name: "Amit Truck", email: "amit.dp@h2o.test", phone: "9876543213", vehicleType: "miniTruck", vehicleNumber: "MH 04 GH 4004" },
  { name: "Priya Tanker", email: "priya.dp@h2o.test", phone: "9876543214", vehicleType: "tanker", vehicleNumber: "MH 05 IJ 5005" },
  { name: "Anita Bike", email: "anita.dp@h2o.test", phone: "9876543216", vehicleType: "bike", vehicleNumber: "MH 06 KL 6006" },
  { name: "Rohan Bicycle", email: "rohan.dp@h2o.test", phone: "9876543217", vehicleType: "bicycle", vehicleNumber: "MH 07 MN 7007" },
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
        vehicleNumber: s.vehicleNumber || "",
        userId: user._id,
        onboardingStatus: "approved",
        documentLicenseVerified: true,
        documentIdentityVerified: true,
        documentVehicleIdentificationVerified: true,
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
