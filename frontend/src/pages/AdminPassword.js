import { Link } from "react-router-dom";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export default function AdminPassword() {
  return (
    <div className="max-w-md fade-in">
      <Link to="/admin" className="text-sm underline text-[var(--green)]">Back to administration</Link>
      <h1 className="mt-3 mb-8 text-3xl font-bold text-[var(--green)]">Change your password</h1>
      <ChangePasswordForm />
    </div>
  );
}
