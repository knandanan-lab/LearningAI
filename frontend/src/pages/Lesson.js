import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Target } from "lucide-react";
import { toast } from "sonner";
import { api, errorText } from "@/lib/api";
import { categoryName } from "@/lib/constants";
import useLearning from "@/lib/useLearning";
import PromptBox from "@/components/PromptBox";
import SafetyNotice from "@/components/SafetyNotice";
import QuickCheck from "@/components/QuickCheck";

function Section({ letter, title, minutes, children, testid }) {
  return (
    <section className="card p-5 sm:p-7" data-testid={testid}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold"><span className="text-[var(--orange)] mr-2">{letter}</span>{title}</h2>
        {minutes && <span className="text-xs text-[var(--muted)]">Suggested guide: about {minutes} min</span>}
      </div>
      {children}
    </section>
  );
}

const Paras = ({ text }) => <div className="prose-plain text-[15px]">{text.split("\n\n").map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}</div>;

export default function Lesson() {
  const { id } = useParams();
  const { lessons, progress, favourites, toggleFavourite, reload } = useLearning();
  const [answer, setAnswer] = useState(null);
  const [reflection, setReflection] = useState(null);
  const [busy, setBusy] = useState(false);
  const record = progress.find((p) => p.lesson_id === id);

  useEffect(() => {
    setAnswer(record?.quiz_answer ?? null);
    setReflection(record?.reflection ?? null);
    window.scrollTo(0, 0);
  }, [id, record?.quiz_answer, record?.reflection]);

  if (!lessons) return null;
  const idx = lessons.findIndex((l) => l.id === id);
  const lesson = lessons[idx];
  if (!lesson) return <p data-testid="lesson-not-found">Lesson not found. <Link to="/pathway" className="underline">Back to pathway</Link></p>;
  const next = lessons[idx + 1];

  const complete = async () => {
    setBusy(true);
    try {
      await api.post(`/progress/${id}`, { quiz_answer: answer, reflection });
      await reload();
      toast.success("Lesson marked complete");
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="space-y-5 fade-in max-w-3xl">
      <header>
        <p className="eyebrow">Day {idx + 1} · {categoryName(lesson.category)}</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-[var(--green)]" data-testid="lesson-title">{lesson.title}</h1>
        <p className="mt-2 text-xs text-[var(--muted)]">Times are a suggested guide, not a countdown. Total about 15 minutes.</p>
        {record && <p className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--green)] font-medium" data-testid="lesson-completed-badge"><CheckCircle2 size={16} /> Completed</p>}
      </header>

      <Section letter="A" title="Work outcome" testid="lesson-outcome">
        <p className="flex gap-3"><Target className="text-[var(--orange)] shrink-0" size={20} />{lesson.outcome}</p>
      </Section>
      <Section letter="B" title="Learn" minutes={2} testid="lesson-learn"><Paras text={lesson.learn} /></Section>
      <Section letter="C" title="See an example" minutes={3} testid="lesson-example"><Paras text={lesson.example} /></Section>
      <Section letter="D" title="Prepare and try" minutes={6} testid="lesson-try">
        <div className="space-y-4">
          <Paras text={lesson.exercise} />
          <SafetyNotice />
          <p className="font-medium">{lesson.prompt_title}</p>
          <PromptBox key={lesson.id} id={lesson.id} original={lesson.prompt} favourite={favourites.includes(lesson.id)} onToggleFavourite={() => toggleFavourite(lesson.id)} />
        </div>
      </Section>
      <Section letter="E" title="Review" minutes={3} testid="lesson-review">
        <ul className="space-y-2">
          {lesson.review.map((r, i) => (
            <li key={i} className="flex gap-3 text-[15px]"><input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--green)]" aria-label={r} data-testid={`review-check-${i}`} />{r}</li>
          ))}
        </ul>
      </Section>
      <Section letter="F" title="Quick check and reflection" minutes={1} testid="lesson-quick-check">
        <div className="space-y-6">
          <QuickCheck question={lesson.question} answer={answer} setAnswer={setAnswer} />
          <div>
            <p className="font-medium mb-2">Do you expect to use this skill in your work? <span className="text-[var(--muted)] font-normal text-sm">(optional)</span></p>
            <div className="flex gap-2">
              {["Yes", "Maybe", "Not yet"].map((r) => (
                <button key={r} type="button" onClick={() => setReflection(r)} className={`btn btn-sm ${reflection === r ? "btn-primary" : "btn-ghost"}`} data-testid={`reflection-${r.toLowerCase().replace(" ", "-")}`}>{r}</button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <div className="flex flex-wrap gap-3 pt-2">
        <button className="btn btn-accent" disabled={busy} onClick={complete} data-testid="mark-complete-button">
          <CheckCircle2 size={18} /> {record ? "Update and save" : "Mark lesson complete"}
        </button>
        {next && <Link to={`/lessons/${next.id}`} className="btn btn-ghost" data-testid="next-lesson-link">Next: Day {idx + 2}</Link>}
        <Link to="/dashboard" className="btn btn-ghost" data-testid="back-dashboard-link">Back to home</Link>
      </div>
    </article>
  );
}
