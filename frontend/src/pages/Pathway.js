import { Link } from "react-router-dom";
import { CheckCircle2, Circle } from "lucide-react";
import useLearning from "@/lib/useLearning";
import ProgressBar from "@/components/ProgressBar";
import PilotFeedback from "@/components/PilotFeedback";

export default function Pathway() {
  const { lessons, done } = useLearning();
  if (!lessons) return null;
  const finished = lessons.length > 0 && (done.size >= lessons.length || done.has(lessons[lessons.length - 1].id));
  return (
    <div className="space-y-8 fade-in">
      <div>
        <p className="eyebrow">My learning pathway</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-[var(--green)]">AI at Work: Foundations</h1>
        <p className="mt-2 text-[var(--muted)]">14 short lessons. Learn at your own pace—you do not need to learn on consecutive days.</p>
      </div>
      <ProgressBar completed={done.size} total={lessons.length} />
      {finished && <PilotFeedback allDone={done.size >= lessons.length} />}
      <ol className="space-y-2" data-testid="pathway-list">
        {lessons.map((l, i) => (
          <li key={l.id}>
            <Link to={`/lessons/${l.id}`} className="card card-link p-4 flex items-start gap-4" data-testid={`pathway-lesson-${l.id}`}>
              {done.has(l.id) ? <CheckCircle2 className="text-[var(--green)] shrink-0 mt-0.5" /> : <Circle className="text-[var(--line)] shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p className="text-xs text-[var(--orange)] font-medium">Day {i + 1}</p>
                <p className="font-medium">{l.title}</p>
                <p className="text-sm text-[var(--muted)] mt-0.5">{l.outcome}</p>
              </div>
              {done.has(l.id) && <span className="text-xs text-[var(--green)] font-medium" data-testid={`pathway-completed-${l.id}`}>Completed</span>}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
