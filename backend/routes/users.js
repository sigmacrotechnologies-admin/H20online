const express = require("express");
const User = require("../models/User");
const { auth } = require("../middleware/auth");

const router = express.Router();
router.use(auth);

router.get("/me", async (req, res) => {
  let user = await User.findById(req.user._id).select("-password").lean();
  if (!user) return res.status(401).json({ error: "User not found" });
  if (!user.userCode) {
    const code = await User.generateUniqueUserCode(user.role || "customer");
    await User.updateOne({ _id: user._id }, { $set: { userCode: code } });
    user = { ...user, userCode: code };
  }
  res.json({ ...user, id: user._id.toString(), _id: user._id.toString() });
});

router.put("/me", async (req, res) => {
  try {
    const { name, email, phone, age, gender, activityLevel, familyMembers } = req.body;
    const user = await User.findById(req.user._id);
    if (name != null && typeof name === "string" && name.trim()) user.name = name.trim();
    if (email != null && typeof email === "string" && email.trim()) user.email = email.trim().toLowerCase();
    if (phone != null) user.phone = typeof phone === "string" ? phone.trim() : String(phone || "");
    if (age != null && age !== undefined) user.age = age;
    if (gender != null && gender !== undefined) user.gender = gender;
    if (activityLevel != null && activityLevel !== undefined) user.activityLevel = activityLevel;
    if (familyMembers != null && familyMembers !== undefined) user.familyMembers = familyMembers;
    await user.save();
    const u = await User.findById(user._id).select("-password").lean();
    const out = { ...u, _id: u._id.toString(), id: u._id.toString() };
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
