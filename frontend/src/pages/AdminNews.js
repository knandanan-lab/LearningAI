import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, EyeOff, ArrowLeft, X, Check, ExternalLink, Upload, Video, Image } from "lucide-react";
import { api, errorText } from "../lib/api";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
const CATEGORIES = ["Productivity", "Policy", "Tools", "Research", "Africa", "Education", "Other"];

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const EMPTY_FORM = { title: "", category: "Tools", excerpt: "", url: "", image_url: "", video_url: "", body: "", published: true };

export default function AdminNews() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [mediaType, setMediaType] = useState("image"); // "image" | "video"
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  function load() {
    setLoading(true);
    api.get("/admin/news")
      .then(r => setArticles(r.data || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setMediaType("image");
    setError("");
    setShowForm(true);
  }

  function openEdit(article) {
    setEditing(article.id);
    setForm({
      title: article.title || "",
      category: article.category || "Tools",
      excerpt: article.excerpt || "",
      url: article.url || "",
      image_url: article.image_url || "",
      video_url: article.video_url || "",
      body: article.body || "",
      published: article.published,
    });
    setMediaType(article.video_url ? "video" : "image");
    setError("");
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditing(null);
    setError("");
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/admin/upload-image", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm(f => ({ ...f, image_url: res.data.url, video_url: "" }));
    } catch (err) {
      setError("Image upload failed: " + errorText(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleVideoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/admin/upload-video", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm(f => ({ ...f, video_url: res.data.url, image_url: "" }));
    } catch (err) {
      setError("Video upload failed: " + errorText(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.excerpt.trim()) {
      setError("Title and summary are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await api.put(`/admin/news/${editing}`, form);
      } else {
        await api.post("/admin/news", form);
      }
      setShowForm(false);
      setEditing(null);
      load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(article) {
    try {
      await api.put(`/admin/news/${article.id}`, { ...article, published: !article.published });
      load();
    } catch {}
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this article? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await api.delete(`/admin/news/${id}`);
      load();
    } catch {}
    setDeletingId(null);
  }

  function resolvePreview(url) {
    if (!url) return "";
    if (url.startsWith("/uploads/")) return `${BACKEND}${url}`;
    return url;
  }

  return (
    <div className="space-y-8 fade-in" data-testid="admin-news-page">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--green)] mb-2">
            <ArrowLeft size={14} /> Back to Admin
          </Link>
          <p className="eyebrow">Content management</p>
          <h1 className="mt-1 text-3xl font-bold text-[var(--green)]">AI News &amp; Insights</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Articles appear on the home page. Published articles are visible to all visitors.</p>
        </div>
        <button className="btn btn-accent" onClick={openNew}>
          <Plus size={16} /> Add article
        </button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="card border-2 border-[var(--sky)] p-6 sm:p-8 space-y-5">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[var(--green)]">{editing ? "Edit article" : "New article"}</h2>
            <button onClick={cancelForm} className="text-[var(--muted)] hover:text-[var(--ink)]"><X size={20} /></button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Title */}
            <div>
              <label className="label">Headline / Title *</label>
              <input
                className="field"
                placeholder="e.g. How African businesses are using AI in 2025"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                maxLength={200}
              />
            </div>

            {/* Category + Published row */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Category *</label>
                <select
                  className="field"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <div className="flex gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, published: true }))}
                    className={`btn btn-sm ${form.published ? "btn-primary" : "btn-ghost"}`}
                  >
                    <Eye size={14} /> Published
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, published: false }))}
                    className={`btn btn-sm ${!form.published ? "btn-primary" : "btn-ghost"}`}
                  >
                    <EyeOff size={14} /> Draft
                  </button>
                </div>
              </div>
            </div>

            {/* Excerpt */}
            <div>
              <label className="label">Short summary (1–2 sentences) *</label>
              <textarea
                className="field"
                rows={3}
                placeholder="Briefly describe what the article is about. This is what visitors read on the home page."
                value={form.excerpt}
                onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                maxLength={400}
              />
              <p className="text-xs text-[var(--muted)] mt-1">{form.excerpt.length}/400 characters</p>
            </div>

            {/* Media — Image or Video toggle */}
            <div>
              <label className="label">Cover media <span className="font-normal text-[var(--muted)]">(optional)</span></label>
              <div className="flex gap-2 mb-3">
                <button type="button"
                  onClick={() => { setMediaType("image"); setForm(f => ({ ...f, video_url: "" })); }}
                  className={`btn btn-sm ${mediaType === "image" ? "btn-primary" : "btn-ghost"}`}>
                  <Image size={14} /> Image
                </button>
                <button type="button"
                  onClick={() => { setMediaType("video"); setForm(f => ({ ...f, image_url: "" })); }}
                  className={`btn btn-sm ${mediaType === "video" ? "btn-primary" : "btn-ghost"}`}>
                  <Video size={14} /> Video
                </button>
              </div>

              {mediaType === "image" && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      className="field flex-1"
                      type="text"
                      placeholder="https://images.unsplash.com/... or /uploads/..."
                      value={form.image_url}
                      onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                    />
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="btn btn-ghost btn-sm whitespace-nowrap">
                      <Upload size={14} /> {uploading ? "Uploading…" : "Upload"}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </div>
                  {form.image_url && (
                    <img src={resolvePreview(form.image_url)} alt="preview"
                      className="rounded-xl object-cover" style={{ height: 100, maxWidth: 200 }}
                      onError={e => { e.target.style.display = "none"; }} />
                  )}
                </div>
              )}

              {mediaType === "video" && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      className="field flex-1"
                      type="text"
                      placeholder="/uploads/... (upload below)"
                      value={form.video_url}
                      onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
                    />
                    <button type="button" onClick={() => videoInputRef.current?.click()}
                      disabled={uploading}
                      className="btn btn-ghost btn-sm whitespace-nowrap">
                      <Upload size={14} /> {uploading ? "Uploading…" : "Upload"}
                    </button>
                    <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/ogg" className="hidden" onChange={handleVideoUpload} />
                  </div>
                  {form.video_url && (
                    <video src={resolvePreview(form.video_url)} muted
                      className="rounded-xl" style={{ height: 100, maxWidth: 200 }} />
                  )}
                </div>
              )}
            </div>

            {/* Full article body */}
            <div>
              <label className="label">Full article text <span className="font-normal text-[var(--muted)]">(optional — used if no external URL)</span></label>
              <textarea
                className="field"
                rows={8}
                placeholder={"Write the full article here.\n\nUse blank lines to separate paragraphs.\n\nLeave empty if you have an external URL to link to."}
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                maxLength={20000}
              />
              <p className="text-xs text-[var(--muted)] mt-1">{form.body.length}/20000 characters</p>
            </div>

            {/* External URL */}
            <div>
              <label className="label">External URL <span className="font-normal text-[var(--muted)]">(optional — overrides article text above)</span></label>
              <input
                className="field"
                type="url"
                placeholder="https://www.bbc.com/..."
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              />
              <p className="text-xs text-[var(--muted)] mt-1">If set, "Read more" links here instead of showing the article text.</p>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="btn btn-accent">
                {saving ? "Saving…" : <><Check size={15} /> {editing ? "Save changes" : "Publish article"}</>}
              </button>
              <button type="button" onClick={cancelForm} className="btn btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Articles list */}
      {loading ? (
        <p className="text-[var(--muted)] text-sm">Loading…</p>
      ) : articles.length === 0 ? (
        <div className="card p-10 text-center space-y-3">
          <p className="text-[var(--muted)]">No articles yet.</p>
          <button className="btn btn-accent" onClick={openNew}><Plus size={15} /> Add your first article</button>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map(article => (
            <div key={article.id} className="card p-4 sm:p-5 flex gap-4 items-start">
              {/* Thumbnail */}
              {article.video_url ? (
                <div className="rounded-xl bg-[var(--wash)] flex-shrink-0 hidden sm:flex items-center justify-center"
                  style={{ width: 80, height: 60 }}>
                  <Video size={20} className="text-[var(--muted)]" />
                </div>
              ) : article.image_url ? (
                <img src={resolvePreview(article.image_url)} alt=""
                  className="rounded-xl object-cover flex-shrink-0 hidden sm:block"
                  style={{ width: 80, height: 60 }}
                  onError={e => { e.target.style.display = "none"; }} />
              ) : (
                <div className="rounded-xl bg-[var(--wash)] flex-shrink-0 hidden sm:block" style={{ width: 80, height: 60 }} />
              )}

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--sky-soft)] text-[var(--sky)]">
                    {article.category}
                  </span>
                  {article.published ? (
                    <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Published</span>
                  ) : (
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Draft</span>
                  )}
                  {article.body && !article.url && (
                    <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">Has article text</span>
                  )}
                </div>
                <p className="font-semibold text-[var(--green)] text-sm leading-snug line-clamp-1">{article.title}</p>
                <p className="text-xs text-[var(--muted)] line-clamp-2">{article.excerpt}</p>
                {article.created_at && (
                  <p className="text-xs text-[var(--muted)]">Added {formatDate(article.created_at)}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {article.url && (
                  <a href={article.url} target="_blank" rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm p-2" title="Open external article">
                    <ExternalLink size={15} />
                  </a>
                )}
                <button onClick={() => togglePublished(article)} className="btn btn-ghost btn-sm p-2"
                  title={article.published ? "Unpublish" : "Publish"}>
                  {article.published ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button onClick={() => openEdit(article)} className="btn btn-ghost btn-sm p-2" title="Edit">
                  <Pencil size={15} />
                </button>
                <button onClick={() => handleDelete(article.id)} disabled={deletingId === article.id}
                  className="btn btn-ghost btn-sm p-2 text-red-500 hover:bg-red-50" title="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
