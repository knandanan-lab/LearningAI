import { ShieldAlert } from "lucide-react";
import { SAFETY_TEXT } from "@/lib/constants";

export default function SafetyNotice() {
  return (
    <div className="flex gap-3 rounded-xl border border-[#f1c9a8] bg-[var(--orange-soft)] p-4 text-sm leading-relaxed" data-testid="safety-notice" role="note">
      <ShieldAlert size={20} className="shrink-0 text-[var(--orange)] mt-0.5" />
      <p>{SAFETY_TEXT}</p>
    </div>
  );
}
