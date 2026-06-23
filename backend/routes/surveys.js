const express = require("express");
const mongoose = require("mongoose");
const Survey = require("../models/Survey");
const SurveyResponse = require("../models/SurveyResponse");

const router = express.Router();

const CHOICE_TYPES = ["single_choice", "multiple_choice", "checkbox"];

function toObjectId(v) {
  if (v == null || v === "") return null;
  if (typeof v === "string" && mongoose.Types.ObjectId.isValid(v) && v.length === 24) return v;
  return null;
}

function formatSurvey(s) {
  return {
    id: s._id.toString(),
    title: s.title,
    description: s.description || "",
    slug: s.slug,
    isActive: !!s.isActive,
    questions: (s.questions || [])
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((q) => ({
        questionId: q.questionId,
        text: q.text,
        type: q.type,
        options: q.options || [],
        required: !!q.required,
        order: q.order || 0,
      })),
    customFields: (s.customFields || [])
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((f) => ({
        fieldId: f.fieldId,
        label: f.label,
        type: f.type,
        options: f.options || [],
        required: !!f.required,
        order: f.order || 0,
        placement: f.placement || "prefix",
      })),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

function normalizeCustomFieldValues(survey, raw) {
  const map = new Map((survey.customFields || []).map((f) => [f.fieldId, f]));
  const out = {};
  const src = raw && typeof raw === "object" ? raw : {};

  for (const f of survey.customFields || []) {
    const val = src[f.fieldId];
    if (f.required) {
      const empty =
        val == null ||
        val === "" ||
        (Array.isArray(val) && val.length === 0);
      if (empty) {
        return { error: `Required field not answered: ${f.label}` };
      }
    }
    if (val == null || val === "") continue;

    if (f.type === "checkbox") {
      out[f.fieldId] = Array.isArray(val) ? val.map(String) : [String(val)];
    } else if (f.type === "number") {
      const n = Number(val);
      if (Number.isNaN(n)) return { error: `Invalid number for: ${f.label}` };
      out[f.fieldId] = n;
    } else {
      out[f.fieldId] = String(val).trim();
    }
  }

  return { value: out };
}

router.get("/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    if (!slug) return res.status(400).json({ error: "Survey slug required" });
    const survey = await Survey.findOne({ slug, isActive: true }).lean();
    if (!survey) return res.status(404).json({ error: "Survey not found or inactive" });
    res.json(formatSurvey(survey));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:slug/responses", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    const survey = await Survey.findOne({ slug, isActive: true });
    if (!survey) return res.status(404).json({ error: "Survey not found or inactive" });

    const { answers, respondentName, respondentEmail, source, metadata, customFields } = req.body || {};
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: "Answers required" });
    }

    const customNorm = normalizeCustomFieldValues(survey, customFields);
    if (customNorm.error) return res.status(400).json({ error: customNorm.error });

    const questionMap = new Map((survey.questions || []).map((q) => [q.questionId, q]));
    const normalized = [];

    for (const q of survey.questions || []) {
      if (!q.required) continue;
      const ans = answers.find((a) => a.questionId === q.questionId);
      const empty =
        !ans ||
        ans.value == null ||
        ans.value === "" ||
        (Array.isArray(ans.value) && ans.value.length === 0);
      if (empty) {
        return res.status(400).json({ error: `Required question not answered: ${q.text}` });
      }
    }

    for (const a of answers) {
      if (!a?.questionId || !questionMap.has(a.questionId)) continue;
      const q = questionMap.get(a.questionId);
      let value = a.value;
      if (q.type === "rating") {
        const n = Number(value);
        if (Number.isNaN(n) || n < 1 || n > 5) {
          return res.status(400).json({ error: `Invalid rating for: ${q.text}` });
        }
        value = n;
      }
      if ((q.type === "multiple_choice" || q.type === "checkbox") && !Array.isArray(value)) {
        value = value != null && value !== "" ? [String(value)] : [];
      }
      normalized.push({ questionId: a.questionId, value });
    }

    const meta = metadata && typeof metadata === "object" ? { ...metadata } : {};
    if (customNorm.value && Object.keys(customNorm.value).length) {
      meta.customFields = customNorm.value;
    }

    const doc = await SurveyResponse.create({
      surveyId: survey._id,
      answers: normalized,
      respondentName: respondentName ? String(respondentName).trim() : "",
      respondentEmail: respondentEmail ? String(respondentEmail).trim() : "",
      source: source ? String(source).trim() : "web",
      metadata: meta,
    });

    res.status(201).json({
      id: doc._id.toString(),
      surveyId: survey._id.toString(),
      submittedAt: doc.createdAt,
      message: "Thank you for your response",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
