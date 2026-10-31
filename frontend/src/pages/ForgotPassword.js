import { useState } from "react";
import { Link } from "react-router-dom";
import { api, errorText } from "@/lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setMsg(data.message);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto fade-in">
      <h1 className="text-3xl sm:text-4xl font-bold text-[var(--green)]">Reset your password</h1>
      <p className="mt-2 text-[var(--muted)]">Enter your email and we will send you a secure link. It works for one hour.</p>
      {msg ? (
        <p className="mt-8 rounded-xl bg-[var(--green-soft)] p-4 text-sm" data-testid="forgot-success">{msg} Please also check your spam folder.</p>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4" data-testid="forgot-form">
          <div>
            <label className="label" htmlFor="forgot-email">Email</label>
            <input id="forgot-email" type="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="forgot-email-input" />
          </div>
          {error && <p className="text-sm text-red-700" data-testid="forgot-error">{error}</p>}
          <button className="btn btn-primary w-full" disabled={busy} data-testid="forgot-submit-button">{busy ? "Sending…" : "Send reset link"}</button>
        </form>
      )}
      <p className="mt-6 text-sm text-center"><Link to="/login" className="text-[var(--green)] underline" data-testid="forgot-back-login">Back to log in</Link></p>
    </div>
  );
}
