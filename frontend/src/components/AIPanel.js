import { useState } from "react";
import { Sparkles, MessageSquareText } from "lucide-react";
import { streamAI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import VerifyNotice from "@/components/VerifyNotice";

export default function AIPanel({ id, prompt }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [out, setOut] = useState("");
  const [mode, setMode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (m) => {
    setMode(m);
    setOut("");
    setError("");
    setBusy(true);
    try {
      await streamAI({ prompt, mode: m }, (t) => setOut((o) => o + t));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!open)
    return (
      <button className="text-sm text-[var(--green)] underline underline-offset-4" onClick={() => setOpen(true)} data-testid={`open-ai-panel-${id}`}>
        Optional: test this prompt inside the app
      </button>
    );

  if (!user.email_verified) return <VerifyNotice compact />;

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--wash)] p-4 space-y-3" data-testid={`ai-panel-${id}`}>
      <p className="text-xs text-[var(--muted)]">
        Your prompt is sent to an external AI provider. The app does not save it. Check every answer before using it.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-accent btn-sm" disabled={busy} onClick={() => run("try")} data-testid={`ai-try-${id}`}>
          <Sparkles size={16} /> Try it
        </button>
        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run("feedback")} data-testid={`ai-feedback-${id}`}>
          <MessageSquareText size={16} /> Feedback on my prompt
        </button>
      </div>
      {error && <p className="text-sm text-red-700" data-testid={`ai-error-${id}`}>{error}</p>}
      {(out || busy) && (
        <div className="rounded-lg bg-white border border-[var(--line)] p-4 text-sm whitespace-pre-wrap leading-relaxed" data-testid={`ai-output-${id}`}>
          <p className="eyebrow mb-2">{mode === "feedback" ? "Prompt feedback" : "AI answer"}</p>
          {out || "Thinking…"}
        </div>
      )}
    </div>
  );
}
