import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api, errorText } from "@/lib/api";

export default function AdminPassword() {
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
      await api.post("/auth/change-password", { current_password: f.current, new_password: f.next });
      toast.success("Password changed");
      setF({ current: "", next: "", confirm: "" });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const fields = [["current", "Current password"], ["next", "New password (at least 8 characters)"], ["confirm", "Confirm new password"]];
  return (
    <div className="max-w-md fade-in">
      <Link to="/admin" className="text-sm underline text-[var(--green)]">Back to administration</Link>
      <h1 className="mt-3 text-3xl font-bold text-[var(--green)]">Change your password</h1>
      <form onSubmit={submit} className="mt-8 space-y-4" data-testid="change-password-form">
        {fields.map(([k, label]) => (
          <div key={k}>
            <label className="label" htmlFor={`pw-${k}`}>{label}</label>
            <input id={`pw-${k}`} type="password" required minLength={k === "current" ? 1 : 8} className="field" value={f[k]} onChange={(e) => set(k, e.target.value)} data-testid={`change-password-${k}-input`} />
          </div>
        ))}
        {error && <p className="text-sm text-red-700" data-testid="change-password-error">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy} data-testid="change-password-submit">{busy ? "Saving…" : "Change password"}</button>
      </form>
    </div>
  );
}
