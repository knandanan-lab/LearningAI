import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, errorText } from "@/lib/api";
import { useAuth, profileComplete } from "@/context/AuthContext";
import { takeReturn } from "@/lib/returnTo";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const sessionId = new URLSearchParams(window.location.hash.slice(1)).get("session_id");
    window.history.replaceState(null, "", window.location.pathname);
    api
      .post("/auth/google", { session_id: sessionId })
      .then(({ data }) => {
        signIn(data);
        navigate(profileComplete(data.user) ? takeReturn() : "/complete-profile", { replace: true });
      })
      .catch((e) => {
        toast.error(errorText(e));
        navigate("/login", { replace: true });
      });
  }, [navigate, signIn]);

  return null;
}
