import { useState } from "react";
import { Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { api, copyText, errorText } from "@/lib/api";

export default function AdminResetLink() {
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  const generate = async (e) => {
    e.preventDefault();
    setBusy(true);
    setLink("");
    try {
      const { data } = await api.post("/admin/reset-link", { email });
      setLink(data.link);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => ((await copyText(link)) ? toast.success("Reset link copied") : toast.error("Could not copy. Please select the link."));

  return (
    <section className="card p-5 sm:p-6 space-y-4 max-w-2xl" data-testid="admin-reset-link-section">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Link2 size={18} className="text-[var(--orange)]" /> Create a password reset link</h2>
        <p className="text-sm text-[var(--muted)] mt-1">
          Use this if a learner does not receive the reset email. The link works once and expires in one hour. Share it only with the account holder, for example by direct message.
        </p>
      </div>
      <form onSubmit={generate} className="flex flex-col sm:flex-row gap-2">
        <input type="email" required placeholder="Learner’s email address" className="field" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="admin-reset-email-input" />
        <button className="btn btn-primary shrink-0" disabled={busy} data-testid="admin-reset-generate-button">{busy ? "Creating…" : "Create link"}</button>
      </form>
      {link && (
        <div className="space-y-2" data-testid="admin-reset-link-result">
          <input readOnly className="field font-mono text-xs" value={link} onFocus={(e) => e.target.select()} data-testid="admin-reset-link-value" />
          <button className="btn btn-ghost btn-sm" onClick={copy} data-testid="admin-reset-copy-button"><Copy size={14} /> Copy link</button>
        </div>
      )}
    </section>
  );
}
