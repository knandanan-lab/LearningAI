import { useState } from "react";
import { Link } from "react-router-dom";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ProfileFields from "@/components/ProfileFields";
import GoogleButton from "@/components/GoogleButton";

export default function Register() {
  const [form, setForm] = useState({ email: "", password: "", first_name: "", country: "", work_function: "", ai_experience: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn } = useAuth();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post("/auth/register", form);
      signIn(data);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto fade-in">
      <h1 className="text-3xl sm:text-4xl font-bold text-[var(--green)]">Create your account</h1>
      <p className="mt-2 text-[var(--muted)]">It takes about a minute. No payment card needed.</p>
      <div className="mt-6"><GoogleButton /></div>
      <div className="my-5 text-center text-xs text-[var(--muted)]">or register with email</div>
      <form onSubmit={submit} className="space-y-4" data-testid="register-form">
        <div>
          <label className="label" htmlFor="reg-email">Email</label>
          <input id="reg-email" type="email" required className="field" value={form.email} onChange={(e) => set("email", e.target.value)} data-testid="register-email-input" />
        </div>
        <div>
          <label className="label" htmlFor="reg-password">Password (at least 8 characters)</label>
          <input id="reg-password" type="password" minLength={8} required className="field" value={form.password} onChange={(e) => set("password", e.target.value)} data-testid="register-password-input" />
        </div>
        <ProfileFields form={form} set={set} />
        {error && <p className="text-sm text-red-700" data-testid="register-error">{error}</p>}
        <p className="text-xs text-[var(--muted)]">
          By creating an account you agree that we store the details above and your learning progress. See our{" "}
          <Link to="/privacy" className="underline">privacy notice</Link>.
        </p>
        <button className="btn btn-primary w-full" disabled={busy} data-testid="register-submit-button">{busy ? "Creating account…" : "Create account"}</button>
      </form>
      <p className="mt-6 text-sm text-center">
        Already registered? <Link to="/login" className="text-[var(--green)] underline" data-testid="go-to-login-link">Log in</Link>
      </p>
    </div>
  );
}
