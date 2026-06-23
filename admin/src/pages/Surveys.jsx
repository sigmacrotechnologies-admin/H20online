import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";
import { api } from "../api/client";
import { API_BASE } from "../api/config";

const QUESTION_TYPES = [
  { value: "single_choice", label: "Single choice (radio)" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "checkbox", label: "Checkbox options" },
  { value: "rating", label: "Rating (1–5)" },
  { value: "text", label: "Open text" },
];

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "number", label: "Number" },
  { value: "checkbox", label: "Checkbox options" },
];

const IMPORT_TEMPLATE = {
  title: "Customer satisfaction survey",
  description: "Sample survey — edit and import",
  slug: "customer-satisfaction",
  isActive: false,
  customFields: [
    {
      label: "Field 1 — Name",
      type: "text",
      required: true,
      placement: "prefix",
      order: 0,
    },
    {
      label: "Field 2 — Department",
      type: "checkbox",
      options: ["Sales", "Operations", "Support"],
      required: false,
      placement: "prefix",
      order: 1,
    },
    {
      label: "Field 3 — Comments",
      type: "text",
      required: false,
      placement: "suffix",
      order: 0,
    },
  ],
  questions: [
    {
      text: "How satisfied are you with our delivery?",
      type: "single_choice",
      options: ["Very satisfied", "Satisfied", "Neutral", "Unsatisfied"],
      required: true,
      order: 0,
    },
    {
      text: "Which services do you use? (select all)",
      type: "checkbox",
      options: ["Instant orders", "Subscriptions", "Water intake tracker"],
      required: true,
      order: 1,
    },
    {
      text: "Any additional feedback?",
      type: "text",
      required: false,
      order: 2,
    },
  ],
};

function emptyQuestion(order = 0) {
  return {
    questionId: "q_" + Math.random().toString(36).slice(2, 10),
    text: "",
    type: "single_choice",
    options: ["Option 1", "Option 2"],
    required: true,
    order,
  };
}

function emptyCustomField(order = 0, placement = "prefix") {
  return {
    fieldId: "f_" + Math.random().toString(36).slice(2, 10),
    label: `Field ${order + 1}`,
    type: "text",
    options: ["Option 1", "Option 2"],
    required: false,
    order,
    placement,
  };
}

function emptyForm() {
  return {
    title: "",
    description: "",
    slug: "",
    isActive: false,
    customFields: [],
    questions: [emptyQuestion(0)],
  };
}

function needsOptions(type) {
  return type === "single_choice" || type === "multiple_choice" || type === "checkbox";
}

function CustomFieldEditor({ fields, placement, onChange, onAdd, title, hint }) {
  const list = fields.filter((f) => f.placement === placement);

  const update = (idx, field, value) => {
    const globalIdx = fields.findIndex((f) => f === list[idx]);
    if (globalIdx < 0) return;
    const next = [...fields];
    next[globalIdx] = { ...next[globalIdx], [field]: value };
    if (field === "type") {
      if (value === "checkbox" && !next[globalIdx].options?.length) {
        next[globalIdx].options = ["Option 1", "Option 2"];
      }
      if (value !== "checkbox") next[globalIdx].options = [];
    }
    onChange(next);
  };

  const updateOption = (idx, oIdx, value) => {
    const globalIdx = fields.findIndex((f) => f === list[idx]);
    const next = [...fields];
    const options = [...(next[globalIdx].options || [])];
    options[oIdx] = value;
    next[globalIdx] = { ...next[globalIdx], options };
    onChange(next);
  };

  const addOption = (idx) => {
    const globalIdx = fields.findIndex((f) => f === list[idx]);
    const next = [...fields];
    const options = [...(next[globalIdx].options || [])];
    options.push(`Option ${options.length + 1}`);
    next[globalIdx] = { ...next[globalIdx], options };
    onChange(next);
  };

  const removeOption = (idx, oIdx) => {
    const globalIdx = fields.findIndex((f) => f === list[idx]);
    const next = [...fields];
    next[globalIdx] = {
      ...next[globalIdx],
      options: (next[globalIdx].options || []).filter((_, i) => i !== oIdx),
    };
    onChange(next);
  };

  const remove = (idx) => {
    const globalIdx = fields.findIndex((f) => f === list[idx]);
    onChange(fields.filter((_, i) => i !== globalIdx));
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <h4 className="card-title">{title}</h4>
      <p className="card-subtitle">{hint}</p>
      {list.length === 0 ? (
        <p style={{ fontSize: 13, color: "#6B7C85", marginBottom: 8 }}>No custom fields in this section.</p>
      ) : (
        list.map((f, idx) => (
          <div key={f.fieldId} style={{ background: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, border: "1px solid #E5E7EB" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <input
                className="input"
                style={{ flex: 1, minWidth: 160 }}
                placeholder="Field label (e.g. Field 1)"
                value={f.label}
                onChange={(e) => update(idx, "label", e.target.value)}
              />
              <select className="input select" style={{ width: 140 }} value={f.type} onChange={(e) => update(idx, "type", e.target.value)}>
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                <input type="checkbox" checked={f.required} onChange={(e) => update(idx, "required", e.target.checked)} />
                Required
              </label>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(idx)}>Remove</button>
            </div>
            {f.type === "checkbox" && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Checkbox options</div>
                {(f.options || []).map((opt, oIdx) => (
                  <div key={oIdx} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <input className="input" value={opt} onChange={(e) => updateOption(idx, oIdx, e.target.value)} />
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeOption(idx, oIdx)}>×</button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => addOption(idx)}>+ Add option</button>
              </div>
            )}
          </div>
        ))
      )}
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => onAdd(placement)}>
        + Add custom field
      </button>
    </div>
  );
}

export default function Surveys() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef(null);

  const load = () => {
    setLoading(true);
    api.surveys()
      .then(setSurveys)
      .catch((e) => alert(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditing(s.id);
    setForm({
      title: s.title,
      description: s.description || "",
      slug: s.slug,
      isActive: s.isActive,
      customFields: (s.customFields || []).map((f, i) => ({ ...f, order: i })),
      questions: (s.questions || []).length ? s.questions.map((q, i) => ({ ...q, order: i })) : [emptyQuestion(0)],
    });
    setShowForm(true);
  };

  const addCustomField = (placement) => {
    setForm((prev) => {
      const samePlacement = prev.customFields.filter((f) => f.placement === placement);
      return {
        ...prev,
        customFields: [...prev.customFields, emptyCustomField(samePlacement.length, placement)],
      };
    });
  };

  const updateQuestion = (idx, field, value) => {
    setForm((prev) => {
      const questions = [...prev.questions];
      questions[idx] = { ...questions[idx], [field]: value };
      if (field === "type") {
        if (!needsOptions(value)) questions[idx].options = [];
        else if (!questions[idx].options?.length) questions[idx].options = ["Option 1", "Option 2"];
      }
      return { ...prev, questions };
    });
  };

  const updateOption = (qIdx, oIdx, value) => {
    setForm((prev) => {
      const questions = [...prev.questions];
      const options = [...(questions[qIdx].options || [])];
      options[oIdx] = value;
      questions[qIdx] = { ...questions[qIdx], options };
      return { ...prev, questions };
    });
  };

  const addOption = (qIdx) => {
    setForm((prev) => {
      const questions = [...prev.questions];
      questions[qIdx] = {
        ...questions[qIdx],
        options: [...(questions[qIdx].options || []), `Option ${(questions[qIdx].options?.length || 0) + 1}`],
      };
      return { ...prev, questions };
    });
  };

  const removeOption = (qIdx, oIdx) => {
    setForm((prev) => {
      const questions = [...prev.questions];
      questions[qIdx] = { ...questions[qIdx], options: (questions[qIdx].options || []).filter((_, i) => i !== oIdx) };
      return { ...prev, questions };
    });
  };

  const addQuestion = () => {
    setForm((prev) => ({ ...prev, questions: [...prev.questions, emptyQuestion(prev.questions.length)] }));
  };

  const removeQuestion = (idx) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order: i })),
    }));
  };

  const buildPayload = () => ({
    title: form.title.trim(),
    description: form.description.trim(),
    slug: form.slug.trim() || undefined,
    isActive: form.isActive,
    customFields: form.customFields
      .filter((f) => f.label.trim())
      .map((f, i) => ({ ...f, order: i, label: f.label.trim() })),
    questions: form.questions
      .filter((q) => q.text.trim())
      .map((q, i) => ({ ...q, order: i, text: q.text.trim() })),
  });

  const saveSurvey = async (launch = false) => {
    if (!form.title.trim()) return alert("Title is required");
    if (!form.questions.some((q) => q.text.trim())) return alert("Add at least one question");
    setSaving(true);
    try {
      const payload = buildPayload();
      if (launch) payload.isActive = true;
      if (editing) await api.updateSurvey(editing, payload);
      else await api.createSurvey(payload);
      setShowForm(false);
      load();
    } catch (e) {
      alert(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([JSON.stringify(IMPORT_TEMPLATE, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "survey-import-template.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.title) throw new Error("Import file must include a title");
      await api.importSurvey(data);
      if (fileInputRef.current) fileInputRef.current.value = "";
      load();
      alert("Survey imported successfully. Activate it to launch.");
    } catch (err) {
      alert(err.message || "Import failed — use the JSON template format");
    } finally {
      setImporting(false);
    }
  };

  const toggleActive = async (s) => {
    try {
      await api.setSurveyActive(s.id, !s.isActive);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const launchSurvey = async (s) => {
    try {
      await api.setSurveyActive(s.id, true);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const deleteSurvey = async (s) => {
    if (!confirm(`Delete "${s.title}" and all ${s.responseCount} responses?`)) return;
    try {
      await api.deleteSurvey(s.id);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const publicUrl = (slug) => `${API_BASE}/api/surveys/${slug}`;
  const questionCount = form.questions.filter((q) => q.text.trim()).length;
  const fieldCount = form.customFields.filter((f) => f.label.trim()).length;

  if (loading) return <LoadingState label="Loading surveys..." />;

  return (
    <div className="admin-page">
      <PageHeader
        title="Surveys & marketing"
        subtitle="Build surveys with custom fields and multiple questions. Import from JSON, launch when ready, and collect responses via API."
      >
        <button type="button" className="btn btn-secondary btn-sm" onClick={downloadTemplate}>Download template</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
          {importing ? "Importing…" : "Import JSON file"}
        </button>
        <input ref={fileInputRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleFileImport} />
        <button type="button" className="btn btn-primary" onClick={openCreate}>+ New survey</button>
      </PageHeader>

      {showForm && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{editing ? "Edit survey" : "New survey"}</h2>
          <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
            <label>
              Survey title *
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label>
              Description
              <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label>
              URL slug (optional)
              <input className="input" value={form.slug} placeholder="customer-feedback" onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Launch survey (active — visible on public API)
            </label>
          </div>

          <CustomFieldEditor
            title="Custom fields (before questions)"
            hint="Optional respondent fields shown first — e.g. Field 1, Field 2, name, department checkboxes."
            placement="prefix"
            fields={form.customFields}
            onChange={(customFields) => setForm({ ...form, customFields })}
            onAdd={addCustomField}
          />

          <h3 style={{ marginBottom: 8 }}>Questions ({questionCount})</h3>
          <p className="card-subtitle">Add multiple questions with single choice, checkboxes, rating, or open text.</p>
          {form.questions.map((q, qIdx) => (
            <div key={q.questionId} style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid #E5E7EB" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: "#6B7C85", padding: "8px 0" }}>Q{qIdx + 1}</span>
                <input
                  className="input"
                  style={{ flex: 1, minWidth: 200 }}
                  placeholder="Question text"
                  value={q.text}
                  onChange={(e) => updateQuestion(qIdx, "text", e.target.value)}
                />
                <select className="input select" style={{ width: 180 }} value={q.type} onChange={(e) => updateQuestion(qIdx, "type", e.target.value)}>
                  {QUESTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                  <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(qIdx, "required", e.target.checked)} />
                  Required
                </label>
                {form.questions.length > 1 && (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeQuestion(qIdx)}>Remove</button>
                )}
              </div>
              {needsOptions(q.type) && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Options</div>
                  {(q.options || []).map((opt, oIdx) => (
                    <div key={oIdx} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                      <input className="input" value={opt} onChange={(e) => updateOption(qIdx, oIdx, e.target.value)} />
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => removeOption(qIdx, oIdx)}>×</button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => addOption(qIdx)}>+ Add option</button>
                </div>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-secondary btn-sm" style={{ marginBottom: 20 }} onClick={addQuestion}>+ Add question</button>

          <CustomFieldEditor
            title="Custom fields (after questions)"
            hint="Extra fields shown after all questions — e.g. Field 3, Field 4, follow-up checkboxes."
            placement="suffix"
            fields={form.customFields}
            onChange={(customFields) => setForm({ ...form, customFields })}
            onAdd={addCustomField}
          />

          <div style={{ background: "#E0F2FE", borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13 }}>
            <strong>Summary:</strong> {questionCount} question(s), {fieldCount} custom field(s).
            Submit payload: <code>customFields</code> + <code>answers[]</code> per question.
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => saveSurvey(false)}>
              {saving ? "Saving…" : "Save survey"}
            </button>
            <button type="button" className="btn btn-approve btn-sm" disabled={saving} onClick={() => saveSurvey(true)}>
              {saving ? "Saving…" : "Save & launch"}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Survey</th>
              <th>Slug / API</th>
              <th>Fields</th>
              <th>Questions</th>
              <th>Responses</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {surveys.length === 0 ? (
              <tr>
                <td colSpan={7}>No surveys yet. Create one or import a JSON file.</td>
              </tr>
            ) : (
              surveys.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.title}</strong>
                    {s.description ? <div style={{ fontSize: 12, color: "#6B7C85" }}>{s.description}</div> : null}
                  </td>
                  <td>
                    <code style={{ fontSize: 11 }}>{s.slug}</code>
                    <div style={{ fontSize: 11, color: "#6B7C85", marginTop: 4 }}>GET {publicUrl(s.slug)}</div>
                  </td>
                  <td>{s.customFieldCount ?? 0}</td>
                  <td>{s.questionCount}</td>
                  <td>{s.responseCount}</td>
                  <td>
                    <span style={{ color: s.isActive ? "#059669" : "#B45309", fontWeight: 600 }}>
                      {s.isActive ? "Launched" : "Draft"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>Edit</button>
                      {!s.isActive ? (
                        <button type="button" className="btn btn-approve btn-sm" onClick={() => launchSurvey(s)}>Launch</button>
                      ) : (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => toggleActive(s)}>Deactivate</button>
                      )}
                      <Link to={`/surveys/${s.id}/results`} className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
                        Results
                      </Link>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => deleteSurvey(s)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ fontSize: 13, color: "#475569" }}>
        <strong>Integration</strong>
        <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
          <li>Fetch launched survey: <code>GET /api/surveys/:slug</code></li>
          <li>
            Submit: <code>POST /api/surveys/:slug/responses</code> with{" "}
            <code>{`{ customFields: { fieldId: value }, answers: [{ questionId, value }] }`}</code>
          </li>
          <li>Import format: download template JSON, edit fields/questions, then <strong>Import JSON file</strong>.</li>
          <li>Custom fields: <code>prefix</code> = before questions, <code>suffix</code> = after questions.</li>
        </ul>
      </div>
    </div>
  );
}
