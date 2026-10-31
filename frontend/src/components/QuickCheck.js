import { CheckCircle2, XCircle } from "lucide-react";

export default function QuickCheck({ question, answer, setAnswer }) {
  const answered = answer !== null;
  const correct = answer === question.correct_index;
  return (
    <div className="space-y-3" data-testid="quick-check">
      <p className="font-medium">{question.text}</p>
      <div className="space-y-2">
        {question.options.map((o, i) => {
          const state = answered && i === question.correct_index ? "!border-[var(--green)] bg-[var(--green-soft)]" : answered && i === answer ? "!border-red-400 bg-red-50" : "";
          return (
            <button key={i} type="button" onClick={() => setAnswer(i)} className={`card w-full text-left px-4 py-3 text-sm min-h-[48px] card-link ${state}`} data-testid={`quiz-option-${i}`}>
              {o}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={`flex gap-2 text-sm rounded-xl p-4 ${correct ? "bg-[var(--green-soft)]" : "bg-red-50"}`} data-testid="quiz-feedback">
          {correct ? <CheckCircle2 size={18} className="text-[var(--green)] shrink-0" /> : <XCircle size={18} className="text-red-600 shrink-0" />}
          <p><strong>{correct ? "Correct. " : "Not quite. "}</strong>{question.feedback}</p>
        </div>
      )}
    </div>
  );
}
