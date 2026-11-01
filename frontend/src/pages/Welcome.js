import { Link } from "react-router-dom";
import { Clock, Briefcase, ShieldCheck } from "lucide-react";

const BENEFITS = [
  [Clock, "Learn in 15 minutes", "One short, practical lesson at a time, whenever suits you."],
  [Briefcase, "Practise with real work tasks", "Emails, agendas, work plans and problem-solving."],
  [ShieldCheck, "Build confidence using AI", "Use AI safely, check the results and stay in control."],
];

export default function Welcome() {
  return (
    <div className="space-y-14 fade-in">
      <section className="max-w-2xl">
        <p className="eyebrow mb-4">Learning AI Africa · A Future Options learning initiative</p>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--green)] leading-[1.05]" data-testid="welcome-headline">
          Make AI work for your work.
        </h1>
        <p className="mt-5 text-base sm:text-lg text-[var(--muted)] leading-relaxed" data-testid="welcome-supporting-text">
          Learn one practical AI skill in 15 minutes a day—and use it to make everyday work easier.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/register" className="btn btn-primary" data-testid="get-started-button">Get started</Link>
          <Link to="/login" className="btn btn-ghost" data-testid="welcome-login-button">Log in</Link>
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-4" data-testid="welcome-benefits">
        {BENEFITS.map(([Icon, title, text]) => (
          <div key={title} className="card p-6">
            <Icon className="text-[var(--orange)]" size={26} />
            <h2 className="mt-4 text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{text}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl bg-[var(--green-soft)] p-6 sm:p-8 max-w-3xl" data-testid="welcome-responsibility-note">
        <h2 className="text-lg font-semibold text-[var(--green)]">You stay responsible for the result</h2>
        <p className="mt-2 text-sm sm:text-base leading-relaxed">
          Learning AI Africa supports your learning. AI tools can be wrong or invent information, so you remain responsible
          for reviewing and checking any AI-generated work before you use it.{" "}
          <Link to="/responsible-ai" className="underline text-[var(--green)]">Read our responsible AI guidance</Link>.
        </p>
      </section>
    </div>
  );
}
