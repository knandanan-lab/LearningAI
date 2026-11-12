import { Link } from "react-router-dom";
import { Clock, Briefcase, ShieldCheck } from "lucide-react";
import NewsInsights from "../components/NewsInsights";

const HERO_IMG =
  "https://images.unsplash.com/photo-1604933762021-54a5858c9832?auto=format&fit=crop&w=900&q=70";

const BENEFITS = [
  [Clock, "Learn in 15 minutes", "One short, practical lesson at a time, whenever suits you.", "chip-sky", "var(--sky)"],
  [Briefcase, "Practise with real work tasks", "Emails, agendas, work plans and problem-solving.", "chip-orange", "var(--orange)"],
  [ShieldCheck, "Build confidence using AI", "Use AI safely, check the results and stay in control.", "chip-navy", "var(--green)"],
];

export default function Welcome() {
  return (
    <div className="space-y-14 fade-in">
      <section className="hero-wash -mx-4 sm:-mx-6 px-4 sm:px-6 py-8 sm:py-12 rounded-3xl grid md:grid-cols-[1.1fr_1fr] gap-10 items-center" data-testid="welcome-hero">
        <div>
          <p className="eyebrow mb-4">Learning AI Africa · A Future Options learning initiative</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--green)] leading-[1.05]" data-testid="welcome-headline">
            Make AI work for <span className="text-[var(--sky)]">your work.</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-[var(--muted)] leading-relaxed" data-testid="welcome-supporting-text">
            Learn one practical AI skill in 15 minutes a day—and use it to make everyday work easier.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="btn btn-accent" data-testid="get-started-button">Get started</Link>
            <Link to="/login" className="btn btn-ghost bg-white" data-testid="welcome-login-button">Log in</Link>
          </div>
        </div>
        <div className="relative max-w-md md:max-w-none mx-auto w-full">
          <div className="absolute -bottom-3 -right-3 w-2/3 h-2/3 rounded-3xl bg-[var(--orange)] opacity-90" aria-hidden="true" />
          <div className="absolute -top-3 -left-3 w-1/3 h-1/3 rounded-3xl bg-[var(--sky)] opacity-80" aria-hidden="true" />
          <img
            src={HERO_IMG}
            alt="A professional working on a laptop at her desk"
            width="900" height="600"
            className="relative rounded-3xl w-full aspect-[4/3] object-cover shadow-lg"
            data-testid="welcome-hero-image"
          />
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-4" data-testid="welcome-benefits">
        {BENEFITS.map(([Icon, title, text, chip, border]) => (
          <div key={title} className="card p-6" style={{ borderTop: `4px solid ${border}` }}>
            <span className={`icon-chip ${chip}`}><Icon size={22} /></span>
            <h2 className="mt-4 text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{text}</p>
          </div>
        ))}
      </section>

      <NewsInsights />

      <section className="rounded-2xl bg-[var(--orange-soft)] border-l-4 border-[var(--orange)] p-6 sm:p-8 max-w-3xl" data-testid="welcome-responsibility-note">
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
