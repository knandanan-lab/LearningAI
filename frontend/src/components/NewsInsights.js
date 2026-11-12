import { useEffect, useState } from "react";
import { ArrowUpRight, Newspaper } from "lucide-react";
import { api } from "../lib/api";

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?auto=format&fit=crop&w=600&q=60";

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

function CategoryTag({ cat }) {
  const { bg, color } = categoryStyle(cat);
  return (
    <span className="inline-block text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
      style={{ background: bg, color }}>
      {cat}
    </span>
  );
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--green)]">AI News &amp; Insights</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map(i => (
          <div key={i} className="card animate-pulse" style={{ height: 300 }}>
            <div style={{ height: 160, background: "var(--wash)", borderRadius: "18px 18px 0 0" }} />
            <div className="p-5 space-y-2">
              <div style={{ height: 16, width: "30%", background: "var(--line)", borderRadius: 6 }} />
              <div style={{ height: 20, width: "80%", background: "var(--line)", borderRadius: 6 }} />
              <div style={{ height: 14, width: "100%", background: "var(--line)", borderRadius: 6 }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  if (articles.length === 0) return null;

  const [featured, ...rest] = articles;

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

      {/* Featured card */}
      <a
        href={featured.url || undefined}
        target={featured.url ? "_blank" : undefined}
        rel="noopener noreferrer"
        className={`card block overflow-hidden group${featured.url ? " card-link" : ""}`}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <div className="grid md:grid-cols-[1fr_1.1fr] gap-0">
          <div className="relative overflow-hidden" style={{ minHeight: 220 }}>
            <img
              src={featured.image_url || PLACEHOLDER_IMG}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ position: "absolute", inset: 0, minHeight: 220 }}
              onError={e => { e.target.src = PLACEHOLDER_IMG; }}
            />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.08), transparent)" }} />
          </div>
          <div className="p-6 sm:p-8 flex flex-col justify-center gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <CategoryTag cat={featured.category} />
              {featured.published_at && (
                <span className="text-xs text-[var(--muted)]">{formatDate(featured.published_at)}</span>
              )}
            </div>
            <h3 className="text-xl font-bold text-[var(--green)] leading-snug group-hover:text-[var(--sky)] transition-colors">
              {featured.title}
            </h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed line-clamp-3">{featured.excerpt}</p>
            {featured.url && (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--sky)] mt-1">
                Read article <ArrowUpRight size={15} />
              </span>
            )}
          </div>
        </div>
      </a>

      {/* Grid of remaining articles */}
      {rest.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rest.map(article => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
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
      <div className="relative overflow-hidden" style={{ height: 160 }}>
        <img
          src={article.image_url || PLACEHOLDER_IMG}
          alt=""
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={e => { e.target.src = PLACEHOLDER_IMG; }}
        />
      </div>
      <div className="p-5 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <CategoryTag cat={article.category} />
          {article.published_at && (
            <span className="text-xs text-[var(--muted)]">{formatDate(article.published_at)}</span>
          )}
        </div>
        <h3 className="font-semibold text-[var(--green)] leading-snug text-base group-hover:text-[var(--sky)] transition-colors line-clamp-2">
          {article.title}
        </h3>
        <p className="text-sm text-[var(--muted)] leading-relaxed line-clamp-3 flex-1">{article.excerpt}</p>
        {article.url && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--sky)] mt-1 self-start">
            Read more <ArrowUpRight size={13} />
          </span>
        )}
      </div>
    </a>
  );
}
