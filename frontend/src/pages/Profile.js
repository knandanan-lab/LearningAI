import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ProfileFields from "@/components/ProfileFields";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export default function Profile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const onboarding = useLocation().pathname === "/complete-profile";
  const [form, setForm] = useState({
    first_name: user.first_name || "", country: user.country || "",
    work_function: user.work_function || "", ai_experience: user.ai_experience || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.put("/profile", form);
      setUser(data);
      toast.success("Profile saved");
      if (onboarding) navigate("/dashboard");
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg fade-in">
      <h1 className="text-3xl sm:text-4xl font-bold text-[var(--green)]">{onboarding ? "Tell us about yourself" : "My profile"}</h1>
      <p className="mt-2 text-[var(--muted)]" data-testid="profile-email">Signed in as {user.email}</p>
      <form onSubmit={submit} className="mt-8 space-y-4" data-testid="profile-form">
        <ProfileFields form={form} set={set} />
        <button className="btn btn-primary w-full sm:w-auto" disabled={busy} data-testid="profile-save-button">
          {busy ? "Saving…" : onboarding ? "Continue" : "Save changes"}
        </button>
      </form>
      {!onboarding && (
        <section className="mt-12 pt-8 border-t border-[var(--line)]" data-testid="profile-password-section">
          <h2 className="text-xl font-semibold mb-4">Change password</h2>
          {user.has_password ? (
            <ChangePasswordForm />
          ) : (
            <p className="text-sm text-[var(--muted)]" data-testid="profile-google-password-note">
              You sign in with Google, so you do not have a Learning AI Africa password. To add one, use “Forgotten your password?” on the log-in page.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
