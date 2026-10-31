import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import useLearning from "@/lib/useLearning";

export default function Tasks() {
  const { lessons, done } = useLearning();
  const [params, setParams] = useSearchParams();
  const active = params.get("category");
  if (!lessons) return null;
  const shown = active ? CATEGORIES.filter((c) => c.id === active) : CATEGORIES;

  return (
    <div className="space-y-8 fade-in">
      <div>
        <p className="eyebrow">Browse work tasks</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-[var(--green)]">What do you need to get done?</h1>
      </div>
      <div className="flex flex-wrap gap-2" data-testid="task-filter">
        <button className={`btn btn-sm ${!active ? "btn-primary" : "btn-ghost"}`} onClick={() => setParams({})} data-testid="task-filter-all">All</button>
        {CATEGORIES.map((c) => (
          <button key={c.id} className={`btn btn-sm ${active === c.id ? "btn-primary" : "btn-ghost"}`} onClick={() => setParams({ category: c.id })} data-testid={`task-filter-${c.id}`}>
            {c.name}
          </button>
        ))}
      </div>
      {shown.map((c) => {
        const items = lessons.filter((l) => l.category === c.id);
        return (
          <section key={c.id} data-testid={`task-section-${c.id}`}>
            <h2 className="text-lg font-semibold mb-3">{c.name}</h2>
            {items.length === 0 && <p className="text-sm text-[var(--muted)]">No tasks in this category yet.</p>}
            <div className="grid sm:grid-cols-2 gap-3">
              {items.map((l) => (
                <Link key={l.id} to={`/lessons/${l.id}`} className="card card-link p-4 flex items-center gap-3" data-testid={`task-item-${l.id}`}>
                  <div className="flex-1">
                    <p className="font-medium">{l.task_label}</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">Lesson: {l.title}</p>
                  </div>
                  {done.has(l.id) ? <CheckCircle2 size={18} className="text-[var(--green)]" /> : <ArrowRight size={18} className="text-[var(--orange)]" />}
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
