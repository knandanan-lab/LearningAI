import { useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { CATEGORIES, categoryName } from "@/lib/constants";
import useLearning from "@/lib/useLearning";
import PromptBox from "@/components/PromptBox";
import SafetyNotice from "@/components/SafetyNotice";

export default function Prompts() {
  const { lessons, favourites, toggleFavourite } = useLearning();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  if (!lessons) return null;
  const term = q.trim().toLowerCase();
  const list = lessons.filter(
    (l) =>
      (!cat || l.category === cat) &&
      (!favOnly || favourites.includes(l.id)) &&
      (!term || [l.prompt_title, l.prompt, l.title, categoryName(l.category)].join(" ").toLowerCase().includes(term))
  );

  return (
    <div className="space-y-6 fade-in">
      <div>
        <p className="eyebrow">Prompt library</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-[var(--green)]">Ready-to-adapt prompts</h1>
        <p className="mt-2 text-[var(--muted)]">Edit a prompt here for your own use. The original lesson prompt stays unchanged.</p>
      </div>
      <SafetyNotice />
      <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input className="field !pl-10" placeholder="Search prompts, e.g. email" value={q} onChange={(e) => setQ(e.target.value)} data-testid="prompt-search-input" />
        </div>
        <select className="field sm:!w-auto" value={cat} onChange={(e) => setCat(e.target.value)} data-testid="prompt-category-filter">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className={`btn ${favOnly ? "btn-primary" : "btn-ghost"}`} onClick={() => setFavOnly((v) => !v)} data-testid="prompt-favourites-toggle">
          My favourites ({favourites.length})
        </button>
      </div>
      <p className="text-sm text-[var(--muted)]" data-testid="prompt-count">{list.length} prompt{list.length === 1 ? "" : "s"}</p>
      <div className="space-y-4">
        {list.map((l) => (
          <div key={l.id} className="card p-5 sm:p-6 space-y-3" data-testid={`prompt-card-${l.id}`}>
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="font-semibold text-lg">{l.prompt_title}</h2>
              <span className="text-xs rounded-full bg-[var(--green-soft)] text-[var(--green)] px-3 py-1 self-start">{categoryName(l.category)}</span>
            </div>
            <PromptBox id={l.id} original={l.prompt} favourite={favourites.includes(l.id)} onToggleFavourite={() => toggleFavourite(l.id)} />
            <Link to={`/lessons/${l.id}`} className="text-sm text-[var(--green)] underline block" data-testid={`prompt-lesson-link-${l.id}`}>Open lesson: {l.title}</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
