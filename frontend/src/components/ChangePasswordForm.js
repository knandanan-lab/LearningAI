import { useState } from "react";
import { toast } from "sonner";
import { api, errorText, setToken } from "@/lib/api";

const FIELDS = [["current", "Current password"], ["next", "New password (at least 8 characters)"], ["confirm", "Confirm new password"]];

export default function ChangePasswordForm() {
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (f.next !== f.confirm) return setError("The new passwords do not match.");
    setBusy(true);
    try {
      const { data } = await api.post("/auth/change-password", { current_password: f.current, new_password: f.next });
      setToken(data.token);
      toast.success("Password changed. Other devices have been signed out.");
      setF({ current: "", next: "", confirm: "" });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="change-password-form">
      {FIELDS.map(([k, label]) => (
        <div key={k}>
          <label className="label" htmlFor={`pw-${k}`}>{label}</label>
          <input id={`pw-${k}`} type="password" required minLength={k === "current" ? 1 : 8} className="field" value={f[k]} onChange={(e) => set(k, e.target.value)} data-testid={`change-password-${k}-input`} />
        </div>
      ))}
      {error && <p className="text-sm text-red-700" data-testid="change-password-error">{error}</p>}
      <button className="btn btn-primary w-full sm:w-auto" disabled={busy} data-testid="change-password-submit">{busy ? "Saving…" : "Change password"}</button>
    </form>
  );
}
