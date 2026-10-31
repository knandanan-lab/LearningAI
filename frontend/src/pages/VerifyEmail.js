import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const { user, refresh } = useAuth();
  const [state, setState] = useState({ status: "working", text: "Confirming your email address…" });
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    api
      .post("/auth/verify-email", { token: params.get("token") || "" })
      .then(({ data }) => {
        setState({ status: "ok", text: data.message });
        refresh();
      })
      .catch((e) => setState({ status: "error", text: errorText(e) }));
  }, [params, refresh]);

  return (
    <div className="max-w-md mx-auto fade-in" data-testid="verify-email-page">
      <h1 className="text-3xl sm:text-4xl font-bold text-[var(--green)]">Confirm your email</h1>
      <p className={`mt-6 rounded-xl p-4 text-sm ${state.status === "error" ? "bg-red-50 text-red-800" : "bg-[var(--green-soft)]"}`} data-testid={`verify-email-${state.status}`}>
        {state.text}
      </p>
      {state.status !== "working" && (
        <Link to={user ? "/dashboard" : "/login"} className="btn btn-primary mt-6" data-testid="verify-email-continue">
          {user ? "Go to my dashboard" : "Log in"}
        </Link>
      )}
    </div>
  );
}
