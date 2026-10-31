import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, errorText } from "@/lib/api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) return setError("The passwords do not match.");
    setBusy(true);
    try {
      const { data } = await api.post("/auth/reset-password", { token, password });
      setMsg(data.message);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto fade-in">
      <h1 className="text-3xl sm:text-4xl font-bold text-[var(--green)]">Choose a new password</h1>
      {msg ? (
        <div className="mt-8 space-y-4">
          <p className="rounded-xl bg-[var(--green-soft)] p-4 text-sm" data-testid="reset-success">{msg}</p>
          <Link to="/login" className="btn btn-primary" data-testid="reset-go-login">Log in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4" data-testid="reset-form">
          <div>
            <label className="label" htmlFor="new-pass">New password (at least 8 characters)</label>
            <input id="new-pass" type="password" minLength={8} required className="field" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="reset-password-input" />
          </div>
          <div>
            <label className="label" htmlFor="confirm-pass">Confirm new password</label>
            <input id="confirm-pass" type="password" minLength={8} required className="field" value={confirm} onChange={(e) => setConfirm(e.target.value)} data-testid="reset-confirm-input" />
          </div>
          {error && <p className="text-sm text-red-700" data-testid="reset-error">{error}</p>}
          <button className="btn btn-primary w-full" disabled={busy || !token} data-testid="reset-submit-button">{busy ? "Saving…" : "Save new password"}</button>
          {!token && <p className="text-sm text-red-700">This link is incomplete. Please request a new reset link.</p>}
        </form>
      )}
    </div>
  );
}
