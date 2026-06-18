const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    from: { type: String, required: true, enum: ["customer", "admin"] },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, trim: true, unique: true, sparse: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: {
      type: String,
      required: true,
      enum: ["order", "delivery", "payment", "account", "product", "other"],
      default: "other",
    },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
      index: true,
    },
    messages: [messageSchema],
  },
  { timestamps: true }
);

ticketSchema.statics.generateUniqueTicketId = async function () {
  let id;
  let exists = true;
  while (exists) {
    id = "TKT_" + String(Math.floor(100000 + Math.random() * 900000));
    exists = await this.exists({ ticketId: id });
  }
  return id;
};

ticketSchema.pre("save", async function () {
  if (!this.ticketId) {
    this.ticketId = await this.constructor.generateUniqueTicketId();
  }
});

module.exports = mongoose.model("CustomerSupportTicket", ticketSchema);
