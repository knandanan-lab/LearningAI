import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { api, errorText } from "@/lib/api";
import { CATEGORIES } from "@/lib/constants";

const TEXT_FIELDS = [
  ["title", "Lesson title", 1], ["task_label", "Task label (Browse work tasks)", 1], ["outcome", "Work outcome", 2],
  ["learn", "Learn – explanation (blank line = new paragraph)", 8], ["example", "See an example", 8],
  ["exercise", "Prepare and try – exercise", 5], ["prompt_title", "Prompt title", 1], ["prompt", "Example prompt", 7],
];

export default function AdminLessonEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.get(`/lessons/${id}`).then(({ data }) => setF({ ...data, reviewText: data.review.join("\n") }));
  }, [id]);
  if (!f) return null;
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setQ = (k, v) => setF((x) => ({ ...x, question: { ...x.question, [k]: v } }));
  const setOpt = (i, v) => setQ("options", f.question.options.map((o, j) => (j === i ? v : o)));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { reviewText, id: _id, ...rest } = f;
    try {
      await api.put(`/admin/lessons/${id}`, { ...rest, order: Number(f.order), review: reviewText.split("\n").map((s) => s.trim()).filter(Boolean) });
      toast.success("Lesson saved");
      navigate("/admin");
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="max-w-3xl space-y-5 fade-in" data-testid="admin-lesson-form">
      <Link to="/admin" className="text-sm underline text-[var(--green)]">Back to administration</Link>
      <h1 className="text-3xl font-bold text-[var(--green)]">Edit lesson</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Category</label>
          <select className="field" value={f.category} onChange={(e) => set("category", e.target.value)} data-testid="admin-category-select">
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Pathway order (1 = first)</label>
          <input type="number" min={1} className="field" value={f.order} onChange={(e) => set("order", e.target.value)} data-testid="admin-order-input" />
        </div>
      </div>
      {TEXT_FIELDS.map(([k, label, rows]) => (
        <div key={k}>
          <label className="label">{label}</label>
          {rows === 1 ? (
            <input className="field" required value={f[k]} onChange={(e) => set(k, e.target.value)} data-testid={`admin-field-${k}`} />
          ) : (
            <textarea className="field" required rows={rows} value={f[k]} onChange={(e) => set(k, e.target.value)} data-testid={`admin-field-${k}`} />
          )}
        </div>
      ))}
      <div>
        <label className="label">Review checklist (one item per line)</label>
        <textarea className="field" rows={5} value={f.reviewText} onChange={(e) => set("reviewText", e.target.value)} data-testid="admin-field-review" />
      </div>
      <fieldset className="card p-5 space-y-3">
        <legend className="font-semibold px-1">Quick-check question</legend>
        <input className="field" required value={f.question.text} onChange={(e) => setQ("text", e.target.value)} data-testid="admin-question-text" />
        {f.question.options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="radio" name="correct" checked={f.question.correct_index === i} onChange={() => setQ("correct_index", i)} aria-label={`Option ${i + 1} is correct`} data-testid={`admin-correct-${i}`} />
            <input className="field" required value={o} onChange={(e) => setOpt(i, e.target.value)} data-testid={`admin-option-${i}`} />
          </div>
        ))}
        <p className="text-xs text-[var(--muted)]">Select the radio button next to the correct answer.</p>
        <label className="label">Feedback explaining the answer</label>
        <textarea className="field" rows={3} required value={f.question.feedback} onChange={(e) => setQ("feedback", e.target.value)} data-testid="admin-question-feedback" />
      </fieldset>
      <button className="btn btn-primary" disabled={busy} data-testid="admin-save-button">{busy ? "Saving…" : "Save lesson"}</button>
    </form>
  );
}
