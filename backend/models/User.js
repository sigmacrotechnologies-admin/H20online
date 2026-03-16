const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const USER_CODE_PREFIX = {
  customer: "Cust_",
  supplier: "Sup_",
  deliveryPartner: "Del_",
  admin: "Admin_",
  "sub-admin": "SubAdmin_",
  corporate: "Corp_",
};

function randomCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

const userSchema = new mongoose.Schema({
  userCode: { type: String, trim: true, unique: true, sparse: true }, // Cust_, Del_, Sup_, Admin_, SubAdmin_, Corp_
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, default: "customer", enum: ["customer", "supplier", "admin", "sub-admin", "deliveryPartner"] },
  segment: { type: String, default: "", enum: ["", "corporate", "organization", "institute", "college"] }, // for customers: corporate / org / institute / college
  age: Number,
  gender: { type: String, enum: ["male", "female", "other", ""] },
  activityLevel: String,
  familyMembers: Number,
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", default: null },
  avatarUrl: String,
}, { timestamps: true });

userSchema.statics.generateUniqueUserCode = async function (role) {
  const prefix = USER_CODE_PREFIX[role] || "Cust_";
  let code;
  let exists = true;
  while (exists) {
    code = prefix + randomCode(8);
    exists = await this.exists({ userCode: code });
  }
  return code;
};

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  if (!this.userCode) {
    this.userCode = await this.constructor.generateUniqueUserCode(this.role || "customer");
  }
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);
