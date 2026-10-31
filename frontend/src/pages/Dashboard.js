import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { CATEGORIES } from "@/lib/constants";
import useLearning from "@/lib/useLearning";
import ProgressBar from "@/components/ProgressBar";

const LINKS = [
  ["/pathway", "My learning pathway", "Route"],
  ["/tasks", "Browse work tasks", "Briefcase"],
  ["/prompts", "Prompt library", "BookOpen"],
  ["/profile", "My profile", "UserRound"],
];

export default function Dashboard() {
  const { user } = useAuth();
  const { lessons, done } = useLearning();
  if (!lessons) return null;
  const nextIdx = lessons.findIndex((l) => !done.has(l.id));
  const next = lessons[nextIdx];

  return (
    <div className="space-y-12 fade-in">
      <section>
        <h1 className="text-3xl sm:text-4xl font-bold" data-testid="dashboard-greeting">Hello, {user.first_name}</h1>
        <p className="mt-2 text-base md:text-lg text-[var(--muted)]">What would you like to accomplish today?</p>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-3 gap-3" data-testid="task-categories">
        {CATEGORIES.map((c) => {
          const Icon = Icons[c.icon];
          return (
            <Link key={c.id} to={`/tasks?category=${c.id}`} className="card card-link p-4 sm:p-5 flex flex-col gap-3" data-testid={`category-${c.id}`}>
              <Icon size={22} className="text-[var(--orange)]" />
              <span className="font-medium text-sm sm:text-base leading-snug">{c.name}</span>
            </Link>
          );
        })}
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="card p-6 !bg-[var(--green)] !border-[var(--green)] text-white" data-testid="continue-learning">
          <p className="text-xs uppercase tracking-[.14em] text-[#f6b98d]">Continue your learning</p>
          {next ? (
            <>
              <h2 className="mt-3 text-xl font-semibold">Day {nextIdx + 1}: {next.title}</h2>
              <p className="mt-2 text-sm text-white/80">{next.outcome}</p>
              <Link to={`/lessons/${next.id}`} className="btn btn-accent mt-5" data-testid="continue-lesson-button">Start lesson</Link>
            </>
          ) : (
            <>
              <h2 className="mt-3 text-xl font-semibold">You have completed the pathway. Well done.</h2>
              <p className="mt-2 text-sm text-white/80">Revisit any lesson or use the prompt library at work.</p>
              <Link to="/pathway" className="btn btn-accent mt-5" data-testid="review-pathway-button">Review lessons</Link>
            </>
          )}
        </div>
        <div className="card p-6 flex flex-col justify-between gap-6">
          <div>
            <p className="eyebrow">AI at Work: Foundations</p>
            <h2 className="mt-2 text-lg font-semibold">Your progress</h2>
          </div>
          <ProgressBar completed={done.size} total={lessons.length} />
        </div>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {LINKS.map(([to, label, icon]) => {
          const Icon = Icons[icon];
          return (
            <Link key={to} to={to} className="card card-link p-4 flex items-center gap-3 text-sm font-medium" data-testid={`dashboard-link-${to.slice(1)}`}>
              <Icon size={18} className="text-[var(--green)]" /> {label}
            </Link>
          );
        })}
      </section>
    </div>
  );
}
