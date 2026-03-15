const mongoose = require("mongoose");

const waterIntakeEntrySchema = new mongoose.Schema({
  type: { type: String, enum: ["glass", "jar", "bottle", "total"], required: true },
  quantity: { type: Number, default: 1 },
  volumeMl: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const waterIntakeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    entries: [waterIntakeEntrySchema],
  },
  { timestamps: true }
);

waterIntakeSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("WaterIntake", waterIntakeSchema);
