const express = require("express");
const mongoose = require("mongoose");
const Survey = require("../models/Survey");
const SurveyResponse = require("../models/SurveyResponse");
const { adminAuth } = require("../middleware/adminAuth");
const { buildSurveyStats, buildAnalysisContext } = require("../services/surveyStats");
const { generateSurveyAnalysis } = require("../services/groq");

const router = express.Router();
router.use(adminAuth);

function toObjectId(v) {
  if (v == null || v === "") return null;
  if (typeof v === "string" && mongoose.Types.ObjectId.isValid(v) && v.length === 24) return v;
  return null;
}

function slugify(text) {
  return String(text || "survey")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "survey";
}

function newQuestionId() {
  return "q_" + Math.random().toString(36).slice(2, 10);
}

function newFieldId() {
  return "f_" + Math.random().toString(36).slice(2, 10);
}

const CHOICE_TYPES = ["single_choice", "multiple_choice", "checkbox"];

function normalizeQuestions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((q, idx) => {
      const type = ["single_choice", "multiple_choice", "checkbox", "text", "rating"].includes(q.type)
        ? q.type
        : "single_choice";
      const options =
        type === "text" || type === "rating"
          ? []
          : (q.options || []).map((o) => String(o).trim()).filter(Boolean);
      return {
        questionId: q.questionId || newQuestionId(),
        text: String(q.text || "").trim(),
        type,
        options,
        required: q.required !== false,
        order: typeof q.order === "number" ? q.order : idx,
      };
    })
    .filter((q) => q.text);
}

function normalizeCustomFields(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f, idx) => {
      const type = ["text", "email", "number", "checkbox"].includes(f.type) ? f.type : "text";
      const placement = f.placement === "suffix" ? "suffix" : "prefix";
      const options =
        type === "checkbox"
          ? (f.options || []).map((o) => String(o).trim()).filter(Boolean)
          : [];
      return {
        fieldId: f.fieldId || newFieldId(),
        label: String(f.label || "").trim(),
        type,
        options,
        required: f.required === true,
        order: typeof f.order === "number" ? f.order : idx,
        placement,
      };
    })
    .filter((f) => f.label);
}

function formatSurveyRow(s, responseCount) {
  return {
    id: s._id.toString(),
    title: s.title,
    description: s.description || "",
    slug: s.slug,
    isActive: !!s.isActive,
    questionCount: (s.questions || []).length,
    customFieldCount: (s.customFields || []).length,
    responseCount: responseCount ?? 0,
    questions: (s.questions || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0)),
    customFields: (s.customFields || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0)),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

router.get("/", async (req, res) => {
  try {
    const surveys = await Survey.find().sort({ updatedAt: -1 }).lean();
    const counts = await SurveyResponse.aggregate([
      { $group: { _id: "$surveyId", count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
    res.json(surveys.map((s) => formatSurveyRow(s, countMap[s._id.toString()] || 0)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid survey id" });
    const survey = await Survey.findById(id).lean();
    if (!survey) return res.status(404).json({ error: "Survey not found" });
    const responseCount = await SurveyResponse.countDocuments({ surveyId: survey._id });
    res.json(formatSurveyRow(survey, responseCount));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, description, slug, isActive, questions, customFields } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ error: "Title required" });

    let finalSlug = slug ? slugify(slug) : slugify(title);
    const existing = await Survey.findOne({ slug: finalSlug });
    if (existing) finalSlug = `${finalSlug}-${Date.now().toString(36)}`;

    const survey = await Survey.create({
      title: String(title).trim(),
      description: description ? String(description).trim() : "",
      slug: finalSlug,
      isActive: !!isActive,
      questions: normalizeQuestions(questions),
      customFields: normalizeCustomFields(customFields),
    });
    res.status(201).json(formatSurveyRow(survey.toObject(), 0));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/import", async (req, res) => {
  try {
    const body = req.body || {};
    const title = body.title;
    if (!title || !String(title).trim()) return res.status(400).json({ error: "Title required in import file" });

    let finalSlug = body.slug ? slugify(body.slug) : slugify(title);
    const existing = await Survey.findOne({ slug: finalSlug });
    if (existing) finalSlug = `${finalSlug}-${Date.now().toString(36)}`;

    const survey = await Survey.create({
      title: String(title).trim(),
      description: body.description ? String(body.description).trim() : "",
      slug: finalSlug,
      isActive: !!body.isActive,
      questions: normalizeQuestions(body.questions),
      customFields: normalizeCustomFields(body.customFields),
    });
    res.status(201).json(formatSurveyRow(survey.toObject(), 0));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid survey id" });
    const survey = await Survey.findById(id);
    if (!survey) return res.status(404).json({ error: "Survey not found" });

    const { title, description, slug, isActive, questions, customFields } = req.body || {};
    if (title != null) survey.title = String(title).trim();
    if (description != null) survey.description = String(description).trim();
    if (slug != null) {
      const next = slugify(slug);
      const clash = await Survey.findOne({ slug: next, _id: { $ne: survey._id } });
      if (clash) return res.status(400).json({ error: "Slug already in use" });
      survey.slug = next;
    }
    if (isActive != null) survey.isActive = !!isActive;
    if (questions != null) survey.questions = normalizeQuestions(questions);
    if (customFields != null) survey.customFields = normalizeCustomFields(customFields);

    await survey.save();
    const responseCount = await SurveyResponse.countDocuments({ surveyId: survey._id });
    res.json(formatSurveyRow(survey.toObject(), responseCount));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/active", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid survey id" });
    const { isActive } = req.body || {};
    const survey = await Survey.findByIdAndUpdate(id, { isActive: !!isActive }, { new: true });
    if (!survey) return res.status(404).json({ error: "Survey not found" });
    res.json({ id: survey._id.toString(), isActive: survey.isActive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid survey id" });
    const survey = await Survey.findByIdAndDelete(id);
    if (!survey) return res.status(404).json({ error: "Survey not found" });
    await SurveyResponse.deleteMany({ surveyId: id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/responses", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid survey id" });
    const survey = await Survey.findById(id).lean();
    if (!survey) return res.status(404).json({ error: "Survey not found" });

    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const responses = await SurveyResponse.find({ surveyId: id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      survey: { id: survey._id.toString(), title: survey.title, slug: survey.slug },
      responses: responses.map((r) => ({
        id: r._id.toString(),
        respondentName: r.respondentName || "",
        respondentEmail: r.respondentEmail || "",
        source: r.source || "web",
        answers: r.answers || [],
        customFields: (r.metadata && r.metadata.customFields) || {},
        submittedAt: r.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/stats", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid survey id" });
    const survey = await Survey.findById(id).lean();
    if (!survey) return res.status(404).json({ error: "Survey not found" });
    const responses = await SurveyResponse.find({ surveyId: id }).sort({ createdAt: -1 }).lean();
    res.json(buildSurveyStats(survey, responses));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/analyze", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid survey id" });
    const survey = await Survey.findById(id).lean();
    if (!survey) return res.status(404).json({ error: "Survey not found" });
    const responses = await SurveyResponse.find({ surveyId: id }).sort({ createdAt: -1 }).lean();
    const context = buildAnalysisContext(survey, responses);
    const analysis = await generateSurveyAnalysis(id, context);
    res.json({ stats: buildSurveyStats(survey, responses), analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
