import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import GoogleButton from "@/components/GoogleButton";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      signIn(data);
      navigate("/dashboard");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto fade-in">
      <h1 className="text-3xl sm:text-4xl font-bold text-[var(--green)]">Log in</h1>
      <p className="mt-2 text-[var(--muted)]">Welcome back. Pick up where you left off.</p>
      <form onSubmit={submit} className="mt-8 space-y-4" data-testid="login-form">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="login-email-input" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" required className="field" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="login-password-input" />
        </div>
        {error && <p className="text-sm text-red-700" data-testid="login-error">{error}</p>}
        <p className="text-sm text-right"><Link to="/forgot-password" className="text-[var(--green)] underline" data-testid="forgot-password-link">Forgotten your password?</Link></p>
        <button className="btn btn-primary w-full" disabled={busy} data-testid="login-submit-button">{busy ? "Logging in…" : "Log in"}</button>
      </form>
      <div className="my-5 text-center text-xs text-[var(--muted)]">or</div>
      <GoogleButton />
      <p className="mt-6 text-sm text-center">
        New to AI in 15? <Link to="/register" className="text-[var(--green)] underline" data-testid="go-to-register-link">Create an account</Link>
      </p>
    </div>
  );
}
