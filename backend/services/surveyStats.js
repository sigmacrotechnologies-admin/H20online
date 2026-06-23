function normalizeValue(v) {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(String);
  return String(v);
}

function buildQuestionStats(survey, responses) {
  const questionMap = new Map((survey.questions || []).map((q) => [q.questionId, q]));
  const stats = [];

  for (const q of survey.questions || []) {
    const base = {
      questionId: q.questionId,
      text: q.text,
      type: q.type,
      totalAnswers: 0,
    };

    if (q.type === "single_choice" || q.type === "multiple_choice" || q.type === "checkbox") {
      const counts = {};
      (q.options || []).forEach((opt) => {
        counts[opt] = 0;
      });
      let answered = 0;
      for (const r of responses) {
        const ans = (r.answers || []).find((a) => a.questionId === q.questionId);
        if (!ans || ans.value == null || ans.value === "") continue;
        answered++;
        if ((q.type === "multiple_choice" || q.type === "checkbox") && Array.isArray(ans.value)) {
          ans.value.forEach((v) => {
            const key = String(v);
            counts[key] = (counts[key] || 0) + 1;
          });
        } else {
          const key = String(ans.value);
          counts[key] = (counts[key] || 0) + 1;
        }
      }
      base.totalAnswers = answered;
      base.distribution = Object.entries(counts).map(([label, count]) => ({
        label,
        count,
        percentage: answered ? Math.round((count / answered) * 100) : 0,
      }));
    } else if (q.type === "rating") {
      const buckets = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;
      let answered = 0;
      for (const r of responses) {
        const ans = (r.answers || []).find((a) => a.questionId === q.questionId);
        if (!ans || ans.value == null || ans.value === "") continue;
        const n = Number(ans.value);
        if (Number.isNaN(n) || n < 1 || n > 5) continue;
        answered++;
        sum += n;
        buckets[n] = (buckets[n] || 0) + 1;
      }
      base.totalAnswers = answered;
      base.average = answered ? Math.round((sum / answered) * 10) / 10 : 0;
      base.distribution = [1, 2, 3, 4, 5].map((n) => ({
        label: String(n),
        count: buckets[n] || 0,
        percentage: answered ? Math.round(((buckets[n] || 0) / answered) * 100) : 0,
      }));
    } else if (q.type === "text") {
      const samples = [];
      for (const r of responses) {
        const ans = (r.answers || []).find((a) => a.questionId === q.questionId);
        if (!ans || !String(ans.value || "").trim()) continue;
        samples.push(String(ans.value).trim());
      }
      base.totalAnswers = samples.length;
      base.textSamples = samples.slice(0, 30);
    }

    stats.push(base);
  }

  return stats;
}

function buildSurveyStats(survey, responses) {
  const totalResponses = responses.length;
  const last7Days = responses.filter((r) => {
    const d = new Date(r.createdAt);
    return Date.now() - d.getTime() <= 7 * 86400000;
  }).length;

  return {
    surveyId: survey._id.toString(),
    title: survey.title,
    slug: survey.slug,
    isActive: survey.isActive,
    totalResponses,
    responsesLast7Days: last7Days,
    questionStats: buildQuestionStats(survey, responses),
  };
}

function buildAnalysisContext(survey, responses) {
  const stats = buildSurveyStats(survey, responses);
  return {
    survey: {
      title: survey.title,
      description: survey.description,
      slug: survey.slug,
      questionCount: (survey.questions || []).length,
    },
    totals: {
      responses: stats.totalResponses,
      last7Days: stats.responsesLast7Days,
    },
    questionStats: stats.questionStats,
    recentRespondents: responses.slice(0, 10).map((r) => ({
      name: r.respondentName || "Anonymous",
      email: r.respondentEmail || "",
      submittedAt: r.createdAt,
    })),
  };
}

module.exports = {
  buildSurveyStats,
  buildAnalysisContext,
  normalizeValue,
};
