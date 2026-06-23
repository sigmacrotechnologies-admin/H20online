import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";
import { api } from "../api/client";

const card = { background: "#f0f7fcd7", borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };
const table = { width: "100%", borderCollapse: "collapse" };
const th = { textAlign: "left", padding: "10px 12px", borderBottom: "2px solid #E5E7EB", fontWeight: 600, color: "#1B2B34" };
const td = { padding: "10px 12px", borderBottom: "1px solid #E5E7EB", color: "#1B2B34", fontSize: 13 };
const btn = { padding: "8px 16px", borderRadius: 8, border: "none", fontWeight: 600, cursor: "pointer" };
const btnPrimary = { ...btn, background: "#1EA7FD", color: "#fff" };
const btnGhost = { ...btn, background: "#E0F2FE", color: "#1B2B34" };

function BarChart({ distribution, maxCount }) {
  const max = maxCount || Math.max(...(distribution || []).map((d) => d.count), 1);
  return (
    <div style={{ marginTop: 8 }}>
      {(distribution || []).map((d) => (
        <div key={d.label} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
            <span>{d.label}</span>
            <span>
              {d.count} ({d.percentage}%)
            </span>
          </div>
          <div style={{ background: "#E5E7EB", borderRadius: 6, height: 10, overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.max(4, (d.count / max) * 100)}%`,
                background: "linear-gradient(90deg, #1EA7FD, #06b6d4)",
                height: "100%",
                borderRadius: 6,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SentimentGauge({ score, label }) {
  const color = score >= 70 ? "#059669" : score >= 45 ? "#D97706" : "#DC2626";
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: "50%",
          border: `6px solid ${color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 8px",
          fontSize: 22,
          fontWeight: 700,
          color,
        }}
      >
        {score}
      </div>
      <div style={{ fontWeight: 600 }}>{label}</div>
    </div>
  );
}

export default function SurveyResults() {
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [stats, setStats] = useState(null);
  const [responses, setResponses] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.survey(id), api.surveyStats(id), api.surveyResponses(id)])
      .then(([s, st, resp]) => {
        setSurvey(s);
        setStats(st);
        setResponses(resp.responses || []);
      })
      .catch((e) => alert(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const data = await api.analyzeSurvey(id);
      setStats(data.stats);
      setAnalysis(data.analysis);
    } catch (e) {
      alert(e.message || "Analysis failed. Check GROQ_API_KEY on backend.");
    } finally {
      setAnalyzing(false);
    }
  };

  const questionLabel = (questionId) => {
    const q = (survey?.questions || []).find((x) => x.questionId === questionId);
    return q?.text || questionId;
  };

  const fieldLabel = (fieldId) => {
    const f = (survey?.customFields || []).find((x) => x.fieldId === fieldId);
    return f?.label || fieldId;
  };

  if (loading) return <LoadingState label="Loading survey results..." />;
  if (!survey) return <div>Survey not found</div>;

  const maxBar = Math.max(...(stats?.questionStats || []).flatMap((q) => (q.distribution || []).map((d) => d.count)), 1);

  return (
    <div className="admin-page">
      <PageHeader
        title={`Results: ${survey.title}`}
        subtitle={`${stats?.totalResponses || 0} total responses · ${stats?.responsesLast7Days || 0} in last 7 days`}
      >
        <Link to="/surveys" style={{ ...btnGhost, textDecoration: "none", display: "inline-block", marginRight: 8 }}>
          ← Back
        </Link>
        <button type="button" style={btnPrimary} disabled={analyzing} onClick={runAnalysis}>
          {analyzing ? "Analyzing..." : "✨ AI analysis (Groq)"}
        </button>
      </PageHeader>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ ...card, marginBottom: 0, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#0369a1" }}>{stats?.totalResponses || 0}</div>
          <div style={{ color: "#6B7C85" }}>Total responses</div>
        </div>
        <div style={{ ...card, marginBottom: 0, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#0369a1" }}>{stats?.responsesLast7Days || 0}</div>
          <div style={{ color: "#6B7C85" }}>Last 7 days</div>
        </div>
        <div style={{ ...card, marginBottom: 0, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#0369a1" }}>{survey.questionCount}</div>
          <div style={{ color: "#6B7C85" }}>Questions</div>
        </div>
        <div style={{ ...card, marginBottom: 0, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: survey.isActive ? "#059669" : "#B45309" }}>
            {survey.isActive ? "Active" : "Inactive"}
          </div>
          <div style={{ color: "#6B7C85", fontSize: 12 }}>{survey.slug}</div>
        </div>
      </div>

      {analysis && (
        <div style={card}>
          <h2 style={{ marginTop: 0, color: "#0369a1" }}>{analysis.headline}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 24, alignItems: "start" }}>
            {analysis.sentiment && (
              <SentimentGauge score={analysis.sentiment.score} label={analysis.sentiment.label} />
            )}
            <div>
              <p style={{ lineHeight: 1.6 }}>{analysis.executiveSummary}</p>
              {analysis.sentiment?.explanation && (
                <p style={{ fontSize: 13, color: "#6B7C85" }}>{analysis.sentiment.explanation}</p>
              )}
            </div>
          </div>

          {analysis.keyFindings?.length > 0 && (
            <>
              <h3>Key findings</h3>
              <ul>{analysis.keyFindings.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </>
          )}
          {analysis.themes?.length > 0 && (
            <>
              <h3>Themes</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {analysis.themes.map((t, i) => (
                  <span key={i} style={{ background: "#E0F2FE", padding: "4px 10px", borderRadius: 999, fontSize: 13 }}>
                    {t}
                  </span>
                ))}
              </div>
            </>
          )}
          {analysis.recommendations?.length > 0 && (
            <>
              <h3>Recommendations</h3>
              <ul>{analysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </>
          )}
          {analysis.sectionAnalysis?.length > 0 && (
            <>
              <h3>Question-level analysis</h3>
              {analysis.sectionAnalysis.map((s, i) => (
                <div key={i} style={{ background: "#fff", padding: 12, borderRadius: 8, marginBottom: 8, border: "1px solid #E5E7EB" }}>
                  <strong>{s.question}</strong>
                  <p style={{ margin: "6px 0 0", fontSize: 13 }}>{s.insight}</p>
                </div>
              ))}
            </>
          )}
          {analysis.fallback && (
            <p style={{ fontSize: 12, color: "#B45309" }}>Using fallback analysis — configure GROQ_API_KEY for full AI insights.</p>
          )}
        </div>
      )}

      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Response charts</h2>
        {(stats?.questionStats || []).length === 0 ? (
          <p>No responses yet.</p>
        ) : (
          stats.questionStats.map((q) => (
            <div key={q.questionId} style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, border: "1px solid #E5E7EB" }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>{q.text}</h3>
              <div style={{ fontSize: 12, color: "#6B7C85", marginBottom: 8 }}>
                {q.type.replace("_", " ")} · {q.totalAnswers} answers
                {q.average != null ? ` · Avg ${q.average}/5` : ""}
              </div>
              {q.distribution?.length > 0 && <BarChart distribution={q.distribution} maxCount={maxBar} />}
              {q.textSamples?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <strong style={{ fontSize: 13 }}>Sample text answers</strong>
                  <ul style={{ fontSize: 13, marginTop: 6 }}>
                    {q.textSamples.slice(0, 8).map((t, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Individual responses</h2>
        {responses.length === 0 ? (
          <p>No submissions yet.</p>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Submitted</th>
                <th style={th}>Respondent</th>
                <th style={th}>Answers</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((r) => (
                <tr key={r.id}>
                  <td style={td}>{new Date(r.submittedAt).toLocaleString()}</td>
                  <td style={td}>
                    {r.respondentName || "Anonymous"}
                    {r.respondentEmail ? <div style={{ fontSize: 11, color: "#6B7C85" }}>{r.respondentEmail}</div> : null}
                  </td>
                  <td style={td}>
                    {r.customFields && Object.keys(r.customFields).length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <strong style={{ fontSize: 12 }}>Custom fields</strong>
                        {Object.entries(r.customFields).map(([fid, val]) => (
                          <div key={fid} style={{ marginBottom: 4, fontSize: 13 }}>
                            <strong>{fieldLabel(fid)}:</strong>{" "}
                            {Array.isArray(val) ? val.join(", ") : String(val)}
                          </div>
                        ))}
                      </div>
                    )}
                    {(r.answers || []).map((a) => (
                      <div key={a.questionId} style={{ marginBottom: 4 }}>
                        <strong>{questionLabel(a.questionId)}:</strong>{" "}
                        {Array.isArray(a.value) ? a.value.join(", ") : String(a.value)}
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
