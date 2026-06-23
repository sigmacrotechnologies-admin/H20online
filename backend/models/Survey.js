const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    text: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["single_choice", "multiple_choice", "checkbox", "text", "rating"],
      default: "single_choice",
    },
    options: [{ type: String, trim: true }],
    required: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const customFieldSchema = new mongoose.Schema(
  {
    fieldId: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["text", "email", "number", "checkbox"],
      default: "text",
    },
    options: [{ type: String, trim: true }],
    required: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    /** prefix = before questions, suffix = after questions (post-options section) */
    placement: { type: String, enum: ["prefix", "suffix"], default: "prefix" },
  },
  { _id: false }
);

const surveySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    isActive: { type: Boolean, default: false },
    questions: [questionSchema],
    customFields: [customFieldSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Survey", surveySchema);
