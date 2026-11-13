import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, Tag } from "lucide-react";
import { api } from "../lib/api";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";

function resolveMedia(url) {
  if (!url) return "";
  if (url.startsWith("/uploads/")) return `${BACKEND}${url}`;
  return url;
}

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function NewsArticlePage() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/news/${id}`)
      .then(res => setArticle(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
      <div style={{ height: 300, background: "var(--wash)", borderRadius: 20 }} />
      <div style={{ height: 32, width: "70%", background: "var(--wash)", borderRadius: 8 }} />
      <div style={{ height: 16, width: "40%", background: "var(--wash)", borderRadius: 8 }} />
      <div className="space-y-2">
        {[1,2,3,4].map(i => <div key={i} style={{ height: 14, background: "var(--wash)", borderRadius: 6 }} />)}
      </div>
    </div>
  );

  if (notFound || !article) return (
    <div className="max-w-2xl mx-auto text-center space-y-4 py-20">
      <p className="text-4xl">📰</p>
      <h1 className="text-2xl font-bold text-[var(--green)]">Article not found</h1>
      <p className="text-[var(--muted)]">This article may have been removed or the link is incorrect.</p>
      <Link to="/" className="btn btn-ghost inline-flex"><ArrowLeft size={15} /> Back to home</Link>
    </div>
  );

  const mediaSrc = resolveMedia(article.video_url || article.image_url);
  const isVideo = !!article.video_url;

  return (
    <article className="max-w-2xl mx-auto space-y-8 fade-in">
      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--green)]">
        <ArrowLeft size={14} /> Back to home
      </Link>

      {/* Cover media */}
      {mediaSrc && (
        isVideo ? (
          <video src={mediaSrc} controls className="w-full rounded-2xl" style={{ maxHeight: 400, background: "#000" }} />
        ) : (
          <img src={mediaSrc} alt="" className="w-full rounded-2xl object-cover" style={{ maxHeight: 400 }}
            onError={e => { e.target.style.display = "none"; }} />
        )
      )}

      {/* Meta */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
          {article.published_at && (
            <span className="flex items-center gap-1">
              <Calendar size={14} /> {formatDate(article.published_at)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Tag size={14} /> {article.category}
          </span>
        </div>

        <h1 className="text-3xl font-bold text-[var(--green)] leading-tight">{article.title}</h1>
        <p className="text-lg text-[var(--muted)] leading-relaxed">{article.excerpt}</p>
      </div>

      {/* Divider */}
      <hr style={{ borderColor: "var(--line)" }} />

      {/* Body */}
      {article.body ? (
        <div
          className="prose prose-green max-w-none text-[var(--ink)] leading-relaxed"
          style={{ fontSize: 16, lineHeight: 1.75 }}
        >
          {article.body.split(/\n{2,}/).map((para, i) => (
            <p key={i} style={{ marginBottom: "1.25em" }}>{para}</p>
          ))}
        </div>
      ) : (
        <p className="text-[var(--muted)] italic">No full article text available.</p>
      )}

      {/* Footer */}
      <div className="pt-4 border-t border-[var(--line)] flex items-center justify-between flex-wrap gap-3">
        <Link to="/" className="btn btn-ghost btn-sm"><ArrowLeft size={14} /> Back to home</Link>
        <span className="text-xs text-[var(--muted)]">Learning AI Africa · A Future Options initiative</span>
      </div>
    </article>
  );
}
