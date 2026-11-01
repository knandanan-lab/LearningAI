import { useEffect, useState } from "react";
import { MessageSquareHeart } from "lucide-react";
import { toast } from "sonner";
import { api, errorText } from "@/lib/api";

const OPTIONS = [[4, "Very useful"], [3, "Useful"], [2, "Somewhat useful"], [1, "Not very useful"]];

export default function PilotFeedback({ allDone }) {
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/feedback").then(({ data }) => {
      if (data) {
        setRating(data.rating);
        setComment(data.comment || "");
        setSaved(true);
      }
    });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put("/feedback", { rating, comment });
      setSaved(true);
      toast.success("Thank you for your feedback");
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5 sm:p-6 space-y-4" data-testid="pilot-feedback">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <MessageSquareHeart size={20} className="text-[var(--orange)]" /> {allDone ? "You have finished the pathway." : "You have reached the end of the pathway."} Tell us what you think
      </h2>
      <form onSubmit={submit} className="space-y-4">
        <fieldset>
          <legend className="label">How useful has “AI at Work: Foundations” been for your work?</legend>
          <div className="flex flex-wrap gap-2 mt-1">
            {OPTIONS.map(([v, label]) => (
              <button type="button" key={v} onClick={() => setRating(v)} aria-pressed={rating === v}
                className={`btn btn-sm ${rating === v ? "btn-primary" : "btn-ghost"}`} data-testid={`feedback-rating-${v}`}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label className="label" htmlFor="feedback-comment">What was most useful, and what should we improve? (optional)</label>
          <textarea id="feedback-comment" rows={3} maxLength={1000} className="field" value={comment}
            onChange={(e) => setComment(e.target.value)} data-testid="feedback-comment-input" />
          <p className="text-xs text-[var(--muted)] mt-1">Please do not include confidential or personal information.</p>
        </div>
        <button className="btn btn-primary" disabled={!rating || busy} data-testid="feedback-submit-button">
          {busy ? "Sending…" : saved ? "Update feedback" : "Send feedback"}
        </button>
        {saved && <p className="text-sm text-[var(--green)]" data-testid="feedback-saved">Thank you. Your feedback has been saved.</p>}
      </form>
    </section>
  );
}
