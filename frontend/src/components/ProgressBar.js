export default function ProgressBar({ completed, total }) {
  const pct = total ? Math.round((completed / total) * 100) : 0;
  return (
    <div data-testid="progress-indicator">
      <div className="flex justify-between text-sm mb-2">
        <span data-testid="progress-count"><strong className="font-semibold">{completed}</strong> of {total} lessons completed</span>
        <span className="font-semibold text-[var(--green)]" data-testid="progress-percentage">{pct}%</span>
      </div>
      <div className="h-3 rounded-full bg-[var(--green-soft)] overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-[var(--green)] rounded-full transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
