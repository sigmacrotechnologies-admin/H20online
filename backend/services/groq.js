const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const cache = new Map();
const pending = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

function getCacheKey(userId, kind) {
  return `${userId}:${kind}`;
}

async function withDedup(key, fn) {
  if (pending.has(key)) return pending.get(key);
  const promise = fn().finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}

function buildFallbackInsight(context) {
  const today = context?.hydration?.today || {};
  const liters = today.totalLiters ?? 0;
  const goal = today.goalLiters ?? context?.hydration?.goalLiters ?? 2.4;
  const pct = today.percentage ?? Math.min(100, Math.round((liters / goal) * 100));
  const weekend = context?.hydration?.weekendAvgLiters ?? 0;
  const weekday = context?.hydration?.weekdayAvgLiters ?? 0;
  const name = context?.userName || "there";
  if (liters === 0) {
    return `Hi ${name}, you haven't logged water today yet. Start with a glass now and aim for ${goal}L to stay on track.`;
  }
  if (weekend > 0 && weekday > weekend + 0.3) {
    return `You're at ${pct}% of your goal today (${liters}L). Weekday intake looks stronger than weekends — try a morning reminder on Saturday.`;
  }
  if (pct >= 100) {
    return `Great job ${name}! You've hit your ${goal}L goal today. Keep steady sips through the evening.`;
  }
  const remaining = Math.max(0, Math.round((goal - liters) * 10) / 10);
  return `You're at ${pct}% of your goal (${liters}L of ${goal}L). About ${remaining}L to go — spread it across the next few hours.`;
}

function buildFallbackIntakeSense(context) {
  const day = context?.dayIntake || {};
  const liters = day.totalLiters ?? 0;
  const goal = day.goalLiters ?? context?.goalLiters ?? 2.4;
  const remaining = day.remainingLiters ?? Math.max(0, Math.round((goal - liters) * 10) / 10);
  const label = context?.isToday ? "today" : context?.selectedDate || "this day";
  if (liters === 0) {
    return `No intake logged for ${label} yet. Log a glass or bottle to start building your hydration picture.`;
  }
  if (remaining <= 0) {
    return `You've reached your goal for ${label} (${liters}L). Excellent consistency — keep it up tomorrow.`;
  }
  return `For ${label}: ${liters}L logged, ${remaining}L left to reach ${goal}L. Try one more glass in the next hour.`;
}

function getCached(userId, kind) {
  const entry = cache.get(getCacheKey(userId, kind));
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(getCacheKey(userId, kind));
    return null;
  }
  return entry.value;
}

function setCache(userId, kind, value) {
  cache.set(getCacheKey(userId, kind), { at: Date.now(), value });
}

async function chatCompletion({ system, user, maxTokens = 600, temperature = 0.5 }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured on the server");
  }

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || "Groq API request failed";
    throw new Error(msg);
  }

  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty response from Groq");
  return text;
}

async function generateWaterInsight(userId, context) {
  return withDedup(`${userId}:insight`, async () => {
    const cached = getCached(userId, "insight");
    if (cached) return { text: cached, cached: true };

    const system = `You are H2O Water Sense, a friendly hydration coach inside the H2O Online water delivery app.
Analyze the user's real hydration data and give ONE short, actionable insight (2-3 sentences max).
Mention patterns (weekday vs weekend, consistency, goal progress). Be encouraging, not medical.
Do not invent data not present in the context. No bullet lists. Plain conversational English.`;

    const user = `User context (JSON):\n${JSON.stringify(context, null, 2)}`;
    try {
      const text = await chatCompletion({ system, user, maxTokens: 180, temperature: 0.45 });
      setCache(userId, "insight", text);
      return { text, cached: false };
    } catch (err) {
      console.error("[groq] insight fallback:", err.message);
      return { text: buildFallbackInsight(context), cached: false, fallback: true };
    }
  });
}

async function generateIntakeSense(userId, context) {
  const cacheKind = `intake:${context.selectedDate || "today"}`;
  return withDedup(`${userId}:${cacheKind}`, async () => {
    const cached = getCached(userId, cacheKind);
    if (cached) return { text: cached, cached: true };

    const system = `You are H2O Water Sense on the Water Intake screen of H2O Online.
Give a brief hydration tip for TODAY based on logged intake vs goal (2-3 sentences).
Suggest practical next steps (when to drink, how much left). Warm tone. Not medical advice.
Use only the provided data. No bullet lists.`;

    const user = `Intake context (JSON):\n${JSON.stringify(context, null, 2)}`;
    try {
      const text = await chatCompletion({ system, user, maxTokens: 200, temperature: 0.45 });
      setCache(userId, cacheKind, text);
      return { text, cached: false };
    } catch (err) {
      console.error("[groq] intake fallback:", err.message);
      return { text: buildFallbackIntakeSense(context), cached: false, fallback: true };
    }
  });
}

async function generateWaterReport(userId, context) {
  const key = getCacheKey(userId, "water-report");
  return withDedup(key, async () => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return { ...cached.data, cached: true };
    }

    const system = `You are H2O Water Sense AI for H2O Online. Generate a personalized Water Activity Report.
Use ONLY the JSON data provided — do not invent numbers or facts.
Respond ONLY with valid JSON (no markdown, no code fences):
{
  "headline": "short engaging title (max 8 words)",
  "overview": "2-3 sentences executive summary",
  "sections": [
    {"title":"Today's Status","content":"2-3 sentences about today's hydration"},
    {"title":"Weekly Pattern","content":"2-3 sentences about last 7 days trends"},
    {"title":"Hydration Insights","content":"2-3 sentences with patterns, weekday vs weekend, consistency"},
    {"title":"Orders & Plans","content":"2-3 sentences about orders, subscriptions, wallet if relevant"}
  ],
  "highlights": ["3-4 short bullet insights as strings"],
  "recommendations": ["3-4 practical actionable tips"]
}
Friendly India-relevant tone. Not medical advice. Keep each section concise.`;

    const user = `User water activity context:\n${JSON.stringify(context, null, 2)}`;

    try {
      const text = await chatCompletion({ system, user, maxTokens: 900, temperature: 0.45 });
      const match = text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : text);
      const report = {
        headline: String(parsed.headline || "Your Water Activity Report").trim(),
        overview: String(parsed.overview || "").trim(),
        sections: Array.isArray(parsed.sections)
          ? parsed.sections
              .map((s) => ({
                title: String(s.title || "").trim(),
                content: String(s.content || "").trim(),
              }))
              .filter((s) => s.title && s.content)
          : [],
        highlights: Array.isArray(parsed.highlights)
          ? parsed.highlights.map((h) => String(h).trim()).filter(Boolean).slice(0, 4)
          : [],
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations.map((r) => String(r).trim()).filter(Boolean).slice(0, 4)
          : [],
        cached: false,
      };
      if (!report.overview && report.sections.length === 0) {
        throw new Error("Empty AI report");
      }
      cache.set(key, { data: report, ts: Date.now() });
      return report;
    } catch (err) {
      console.error("[groq] report fallback:", err.message);
      const { buildFallbackAiReport } = require("./waterReportBuilder");
      return { ...buildFallbackAiReport(context), cached: false, fallback: true };
    }
  });
}

async function answerAppQuestion(userId, context, question) {
  const system = `You are H2O Online's helpful AI assistant for customers.
Answer questions about hydration, water intake logging, ordering jars/bottles, subscriptions, wallet, billing, and app features.
Use the user's activity context when relevant. Keep answers concise (under 120 words). Friendly tone.
If unsure, suggest using Support or the relevant app screen. Not medical advice.`;

  const user = `User question: ${question}\n\nUser context (JSON):\n${JSON.stringify(context, null, 2)}`;
  const text = await chatCompletion({ system, user, maxTokens: 280, temperature: 0.5 });
  return { text };
}

module.exports = {
  generateWaterInsight,
  generateIntakeSense,
  generateWaterReport,
  answerAppQuestion,
};
