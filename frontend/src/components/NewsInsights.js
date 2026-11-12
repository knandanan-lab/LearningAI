import { useEffect, useState } from "react";
import { ArrowUpRight, Newspaper } from "lucide-react";
import { api } from "../lib/api";

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?auto=format&fit=crop&w=600&q=60";
const BACKEND = process.env.REACT_APP_BACKEND_URL || "";

function resolveImage(url) {
  if (!url) return "";
  if (url.startsWith("/uploads/")) return `${BACKEND}${url}`;
  return url;
}

const CATEGORY_COLORS = {
  "Productivity": { bg: "var(--sky-soft)", color: "var(--sky)" },
  "Policy": { bg: "var(--orange-soft)", color: "var(--orange)" },
  "Tools": { bg: "var(--green-soft)", color: "var(--green)" },
  "Research": { bg: "#f0f0f8", color: "#5b5b8a" },
  "Africa": { bg: "#edf7f0", color: "#2d7a4a" },
};

function categoryStyle(cat) {
  return CATEGORY_COLORS[cat] ?? { bg: "var(--wash)", color: "var(--muted)" };
}

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function NewsInsights() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/news")
      .then(res => setArticles(res.data || []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="icon-chip chip-sky"><Newspaper size={20} /></span>
        <div>
          <p className="eyebrow">Stay current</p>
          <h2 className="text-2xl font-bold text-[var(--green)] leading-tight">AI News &amp; Insights</h2>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="card animate-pulse" style={{ height: 340 }}>
            <div style={{ height: 180, background: "var(--wash)", borderRadius: "18px 18px 0 0" }} />
            <div className="p-5 space-y-2">
              <div style={{ height: 14, width: "40%", background: "var(--line)", borderRadius: 6 }} />
              <div style={{ height: 18, width: "85%", background: "var(--line)", borderRadius: 6 }} />
              <div style={{ height: 13, width: "100%", background: "var(--line)", borderRadius: 6 }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  if (articles.length === 0) return null;

  return (
    <section className="space-y-6" data-testid="news-insights">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="icon-chip chip-sky"><Newspaper size={20} /></span>
        <div>
          <p className="eyebrow">Stay current</p>
          <h2 className="text-2xl font-bold text-[var(--green)] leading-tight">AI News &amp; Insights</h2>
        </div>
      </div>

      {/* Equal 3-column grid — all articles the same size */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map(article => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}

function ArticleCard({ article }) {
  return (
    <a
      href={article.url || undefined}
      target={article.url ? "_blank" : undefined}
      rel="noopener noreferrer"
      className={`card flex flex-col overflow-hidden group${article.url ? " card-link" : ""}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      {/* Image */}
      <div className="relative overflow-hidden" style={{ height: 180 }}>
        <img
          src={resolveImage(article.image_url) || PLACEHOLDER_IMG}
          alt=""
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={e => { e.target.src = PLACEHOLDER_IMG; }}
        />
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col gap-2 flex-1">
        {/* Date + Category row */}
        <div className="flex items-center gap-2 flex-wrap">
          {article.published_at && (
            <span className="text-xs text-[var(--muted)]">{formatDate(article.published_at)}</span>
          )}
          <CategoryTag cat={article.category} />
        </div>

        {/* Title */}
        <h3 className="font-bold text-[var(--green)] leading-snug text-base group-hover:text-[var(--sky)] transition-colors line-clamp-3 flex-1">
          {article.title}
        </h3>

        {/* Read more */}
        {article.url && (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--sky)] mt-1 self-start">
            Read more <ArrowUpRight size={14} />
          </span>
        )}
      </div>
    </a>
  );
}

function CategoryTag({ cat }) {
  const { bg, color } = categoryStyle(cat);
  return (
    <span className="inline-block text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
      style={{ background: bg, color }}>
      {cat}
    </span>
  );
}
