import { useEffect, useState } from "react";
import { ArrowUpRight, Newspaper, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?auto=format&fit=crop&w=600&q=60";
const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
const PAGE_SIZE = 3;

function resolveMedia(url) {
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

// Returns the href and whether it's external
function articleLink(article) {
  if (article.url) return { href: article.url, external: true };
  if (article.body) return { href: `/news/${article.id}`, external: false };
  return null;
}

export default function NewsInsights() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

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
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  if (articles.length === 0) return null;

  const totalPages = Math.ceil(articles.length / PAGE_SIZE);
  const visible = articles.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <section className="space-y-6" data-testid="news-insights">
      {/* Header with arrows */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="icon-chip chip-sky"><Newspaper size={20} /></span>
          <div>
            <p className="eyebrow">Stay current</p>
            <h2 className="text-2xl font-bold text-[var(--green)] leading-tight">AI News &amp; Insights</h2>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--muted)]">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => p - 1)} disabled={!canPrev}
              className="btn btn-ghost btn-sm p-2 rounded-full"
              style={{ opacity: canPrev ? 1 : 0.35 }} aria-label="Previous articles">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => setPage(p => p + 1)} disabled={!canNext}
              className="btn btn-ghost btn-sm p-2 rounded-full"
              style={{ opacity: canNext ? 1 : 0.35 }} aria-label="Next articles">
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visible.map(article => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      {/* Dot indicators */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-1">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button key={i} onClick={() => setPage(i)}
              className="rounded-full transition-all"
              style={{
                width: i === page ? 20 : 8, height: 8,
                background: i === page ? "var(--sky)" : "var(--line)",
                border: "none", cursor: "pointer", padding: 0,
              }}
              aria-label={`Go to page ${i + 1}`} />
          ))}
        </div>
      )}
    </section>
  );
}

function ArticleCard({ article }) {
  const link = articleLink(article);
  const imgSrc = resolveMedia(article.image_url) || PLACEHOLDER_IMG;
  const videoSrc = resolveMedia(article.video_url);

  const inner = (
    <>
      {/* Media */}
      <div className="relative overflow-hidden" style={{ height: 180 }}>
        {videoSrc ? (
          <>
            <video src={videoSrc} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.3)" }}>
              <span className="bg-white rounded-full p-3 shadow-lg">
                <Play size={18} className="text-[var(--green)]" fill="currentColor" />
              </span>
            </div>
          </>
        ) : (
          <img src={imgSrc} alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={e => { e.target.src = PLACEHOLDER_IMG; }} />
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {article.published_at && (
            <span className="text-xs text-[var(--muted)]">{formatDate(article.published_at)}</span>
          )}
          <CategoryTag cat={article.category} />
        </div>
        <h3 className="font-bold text-[var(--green)] leading-snug text-base group-hover:text-[var(--sky)] transition-colors line-clamp-3 flex-1">
          {article.title}
        </h3>
        {link && (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--sky)] mt-1 self-start">
            Read more {link.external ? <ArrowUpRight size={14} /> : <ArrowUpRight size={14} />}
          </span>
        )}
      </div>
    </>
  );

  const cardClass = `card flex flex-col overflow-hidden group${link ? " card-link" : ""}`;

  if (!link) return <div className={cardClass}>{inner}</div>;
  if (link.external) return (
    <a href={link.href} target="_blank" rel="noopener noreferrer"
      className={cardClass} style={{ textDecoration: "none", color: "inherit" }}>
      {inner}
    </a>
  );
  return (
    <Link to={link.href} className={cardClass} style={{ textDecoration: "none", color: "inherit" }}>
      {inner}
    </Link>
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
