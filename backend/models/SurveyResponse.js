const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

const surveyResponseSchema = new mongoose.Schema(
  {
    surveyId: { type: mongoose.Schema.Types.ObjectId, ref: "Survey", required: true, index: true },
    answers: [answerSchema],
    respondentName: { type: String, default: "", trim: true },
    respondentEmail: { type: String, default: "", trim: true },
    source: { type: String, default: "web", trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

surveyResponseSchema.index({ surveyId: 1, createdAt: -1 });

module.exports = mongoose.model("SurveyResponse", surveyResponseSchema);
