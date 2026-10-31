import SafetyNotice from "@/components/SafetyNotice";

const POINTS = [
  ["AI can be wrong", "AI tools can produce incorrect or invented information, including facts, figures, quotations and sources that look convincing."],
  ["Check important facts and sources", "Verify key facts, numbers, dates, laws and references against reliable original sources before you rely on them."],
  ["You review the final output", "You are responsible for anything you send, publish or act on. Read and edit every AI draft before using it."],
  ["Specialist decisions need professional judgement", "Legal, medical, financial and other specialist decisions require appropriate professional judgement. AI can support thinking but must not replace it."],
  ["Removing names is not enough", "Taking out names does not automatically make information safe. Other details can still identify people or organisations. If in doubt, leave it out."],
];

export default function Guidance() {
  return (
    <div className="max-w-2xl space-y-6 fade-in" data-testid="guidance-page">
      <p className="eyebrow">Responsible AI guidance</p>
      <h1 className="text-3xl sm:text-4xl font-bold text-[var(--green)]">Using AI responsibly at work</h1>
      <SafetyNotice />
      <div className="space-y-3">
        {POINTS.map(([t, d]) => (
          <div key={t} className="card p-5">
            <h2 className="font-semibold">{t}</h2>
            <p className="mt-1 text-sm text-[var(--muted)] leading-relaxed">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
