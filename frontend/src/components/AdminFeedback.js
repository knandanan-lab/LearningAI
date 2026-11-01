import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AdminFeedback() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get("/admin/feedback").then((r) => setData(r.data));
  }, []);
  if (!data) return null;
  return (
    <section className="card p-5 sm:p-6 space-y-4" data-testid="admin-feedback-section">
      <h2 className="text-lg font-semibold">Pilot feedback ({data.responses} {data.responses === 1 ? "response" : "responses"})</h2>
      <div className="flex flex-wrap gap-2 text-sm">
        {Object.entries(data.counts).map(([label, n]) => (
          <span key={label} className="rounded-full bg-[var(--wash)] px-3 py-1" data-testid={`admin-feedback-count-${label.toLowerCase().replace(/ /g, "-")}`}>
            {label}: <strong>{n}</strong>
          </span>
        ))}
      </div>
      {data.comments.length > 0 ? (
        <ul className="space-y-3" data-testid="admin-feedback-comments">
          {data.comments.map((c, i) => (
            <li key={i} className="border-l-2 border-[var(--orange)] pl-3 text-sm">
              <p className="whitespace-pre-wrap">{c.comment}</p>
              <p className="text-xs text-[var(--muted)] mt-1">{c.rating} · {c.date}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--muted)]">No written comments yet.</p>
      )}
      <p className="text-xs text-[var(--muted)]">Comments are shown without names.</p>
    </section>
  );
}
