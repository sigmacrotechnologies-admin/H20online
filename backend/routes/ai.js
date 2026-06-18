const express = require("express");
const { auth } = require("../middleware/auth");
const {
  buildDashboardContext,
  buildIntakeContext,
  buildReportContext,
} = require("../services/waterAiContext");
const { buildFallbackAiReport } = require("../services/waterReportBuilder");
const {
  generateWaterInsight,
  generateIntakeSense,
  generateWaterReport,
  answerAppQuestion,
} = require("../services/groq");

const router = express.Router();
router.use(auth);

router.get("/water-insight", async (req, res) => {
  try {
    const context = await buildDashboardContext(req.user);
    const result = await generateWaterInsight(req.user._id.toString(), context);
    res.json({ insight: result.text, cached: result.cached });
  } catch (err) {
    console.error("[ai/water-insight]", err.message);
    res.status(500).json({ error: err.message || "Failed to generate insight" });
  }
});

router.get("/intake-sense", async (req, res) => {
  try {
    const { date } = req.query;
    const context = await buildIntakeContext(req.user, date);
    const result = await generateIntakeSense(req.user._id.toString(), context);
    res.json({ sense: result.text, cached: result.cached });
  } catch (err) {
    console.error("[ai/intake-sense]", err.message);
    res.status(500).json({ error: err.message || "Failed to generate intake sense" });
  }
});

router.post("/water-report", async (req, res) => {
  try {
    const context = await buildReportContext(req.user);
    let report;
    try {
      report = await generateWaterReport(req.user._id.toString(), context);
    } catch (err) {
      console.error("[ai/water-report]", err.message);
      report = { ...buildFallbackAiReport(context), fallback: true };
    }
    res.json({
      userName: context.userName,
      generatedAt: context.generatedAt,
      headline: report.headline || "",
      overview: report.overview || "",
      sections: report.sections || [],
      highlights: report.highlights || [],
      recommendations: report.recommendations || [],
      report: report.overview || report.headline || "",
      cached: report.cached || false,
    });
  } catch (err) {
    console.error("[ai/water-report]", err.message);
    res.status(500).json({ error: err.message || "Failed to generate report" });
  }
});

router.post("/ask", async (req, res) => {
  try {
    const question = String(req.body?.question || "").trim();
    if (!question) return res.status(400).json({ error: "Question is required" });
    if (question.length > 500) return res.status(400).json({ error: "Question too long" });
    const context = await buildReportContext(req.user);
    const result = await answerAppQuestion(req.user._id.toString(), context, question);
    res.json({ answer: result.text });
  } catch (err) {
    console.error("[ai/ask]", err.message);
    res.status(500).json({ error: err.message || "Failed to answer question" });
  }
});

module.exports = router;
