import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  ["/dashboard", "Home"],
  ["/pathway", "Pathway"],
  ["/tasks", "Tasks"],
  ["/prompts", "Prompts"],
  ["/profile", "Profile"],
];

function Brand() {
  return (
    <Link to="/" className="flex flex-col leading-tight" data-testid="brand-link">
      <span className="font-display text-xl font-bold text-[var(--green)]">
        Learning AI <span className="text-[var(--orange)]">Africa</span>
      </span>
      <span className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
        <img src="/future-options-mark.png" alt="Future Options logo" width="18" height="18" className="h-[18px] w-[18px]" data-testid="header-fo-logo" />
        A Future Options learning initiative
      </span>
    </Link>
  );
}

export default function Layout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const logout = () => {
    signOut();
    navigate("/");
  };
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--line)] bg-white sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Brand />
          {user ? (
            <button onClick={logout} className="btn btn-ghost btn-sm" data-testid="logout-button">
              <LogOut size={16} /> Log out
            </button>
          ) : (
            <Link to="/login" className="btn btn-ghost btn-sm" data-testid="header-login-link">Log in</Link>
          )}
        </div>
        {user && (
          <nav className="max-w-5xl mx-auto px-2 sm:px-4 flex overflow-x-auto text-sm" data-testid="main-nav">
            {[...NAV, ...(user.role === "admin" ? [["/admin", "Admin"]] : [])].map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                data-testid={`nav-${label.toLowerCase()}`}
                className={({ isActive }) =>
                  `px-3 py-3 whitespace-nowrap border-b-2 transition-colors ${
                    isActive ? "border-[var(--orange)] text-[var(--green)] font-medium" : "border-transparent text-[var(--muted)] hover:text-[var(--green)]"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">{children}</main>
      <footer className="border-t border-[var(--line)] bg-[var(--wash)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-sm text-[var(--muted)] flex flex-wrap items-center gap-x-6 gap-y-4 justify-between">
          <span className="flex items-center gap-4">
            <img src="/future-options-logo.png" alt="Future Options – consulting for future" width="88" height="64" className="h-16 w-auto" loading="lazy" data-testid="footer-fo-logo" />
            <span>Learning AI Africa · A Future Options learning initiative</span>
          </span>
          <span className="flex gap-5">
            <Link to="/responsible-ai" className="hover:text-[var(--green)]" data-testid="footer-guidance-link">Responsible AI</Link>
            <Link to="/privacy" className="hover:text-[var(--green)]" data-testid="footer-privacy-link">Privacy notice</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
