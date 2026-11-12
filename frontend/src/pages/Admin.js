import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Pencil, Newspaper } from "lucide-react";
import { api } from "@/lib/api";
import { categoryName } from "@/lib/constants";
import AdminResetLink from "@/components/AdminResetLink";
import AdminFeedback from "@/components/AdminFeedback";

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [lessons, setLessons] = useState([]);
  useEffect(() => {
    api.get("/admin/stats").then((r) => setStats(r.data));
    api.get("/lessons").then((r) => setLessons(r.data));
  }, []);
  if (!stats) return null;
  const counts = Object.fromEntries(stats.by_lesson.map((b) => [b.id, b.completions]));
  const refl = Object.fromEntries(stats.by_lesson.map((b) => [b.id, b.reflections]));

  return (
    <div className="space-y-8 fade-in" data-testid="admin-page">
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-[var(--green)]">Content and usage</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/admin/news" className="btn btn-accent btn-sm"><Newspaper size={14} /> Manage news</Link>
          <Link to="/admin/password" className="btn btn-ghost btn-sm" data-testid="admin-change-password-link"><KeyRound size={14} /> Change my password</Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div className="card p-5"><p className="text-sm text-[var(--muted)]">Registered learners</p><p className="text-3xl font-display font-bold" data-testid="admin-stat-users">{stats.registered_users}</p></div>
        <div className="card p-5"><p className="text-sm text-[var(--muted)]">Lessons completed</p><p className="text-3xl font-display font-bold" data-testid="admin-stat-completions">{stats.lessons_completed}</p></div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm" data-testid="admin-lessons-table">
          <thead className="bg-[var(--wash)] text-left">
            <tr><th className="p-3">Order</th><th className="p-3">Lesson</th><th className="p-3 hidden sm:table-cell">Category</th><th className="p-3">Completions</th><th className="p-3 whitespace-nowrap" title="Do you expect to use this skill in your work?">Yes / Maybe / Not yet</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {lessons.map((l) => (
              <tr key={l.id} className="border-t border-[var(--line)]">
                <td className="p-3">{l.order}</td>
                <td className="p-3">{l.title}</td>
                <td className="p-3 hidden sm:table-cell text-[var(--muted)]">{categoryName(l.category)}</td>
                <td className="p-3" data-testid={`admin-completions-${l.id}`}>{counts[l.id] || 0}</td>
                <td className="p-3 whitespace-nowrap" data-testid={`admin-reflections-${l.id}`}>
                  {refl[l.id] ? `${refl[l.id].Yes} / ${refl[l.id].Maybe} / ${refl[l.id]["Not yet"]}` : "0 / 0 / 0"}
                </td>
                <td className="p-3"><Link to={`/admin/lessons/${l.id}`} className="btn btn-ghost btn-sm" data-testid={`admin-edit-${l.id}`}><Pencil size={14} /> Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-[var(--muted)] max-w-2xl">
        Changes to a lesson update the pathway, task library and prompt library immediately. Setting a lesson’s “Order” moves it to that position and renumbers the other lessons automatically. Reflection counts show answers to “Do you expect to use this skill in your work?”.
      </p>
      <AdminFeedback />
      <AdminResetLink />
    </div>
  );
}
