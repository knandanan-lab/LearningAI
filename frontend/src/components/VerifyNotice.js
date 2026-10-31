import { useState } from "react";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { api, errorText } from "@/lib/api";

export default function VerifyNotice({ compact = false }) {
  const [busy, setBusy] = useState(false);
  const resend = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/auth/resend-verification");
      toast.success(data.message);
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={`flex gap-3 rounded-xl border border-[var(--line)] bg-[var(--wash)] ${compact ? "p-3" : "p-4"} text-sm`} data-testid="verify-email-notice">
      <MailCheck size={20} className="shrink-0 text-[var(--green)] mt-0.5" />
      <div className="space-y-2">
        <p>Please confirm your email address to use the in-app AI. We sent you a confirmation link when you registered.</p>
        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={resend} data-testid="resend-verification-button">
          {busy ? "Sending…" : "Send the link again"}
        </button>
      </div>
    </div>
  );
}
