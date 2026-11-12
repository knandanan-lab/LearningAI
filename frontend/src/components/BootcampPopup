import { useState, useEffect } from "react";
import { X, Zap } from "lucide-react";

const STORAGE_KEY = "bootcamp_popup_dismissed_nov2026";

export default function BootcampPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed this session
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch {}
    // Show after 4 seconds
    const t = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setVisible(false);
    try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch {}
  }

  if (!visible) return null;

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className="fixed inset-0 bg-black/20 z-40 sm:hidden"
        onClick={dismiss}
      />

      {/* Popup — bottom-right on desktop, bottom sheet on mobile */}
      <div
        role="dialog"
        aria-label="AI Bootcamp promotion"
        className="fixed z-50 bottom-5 right-5 left-5 sm:left-auto sm:w-80 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: "white",
          border: "1.5px solid var(--line)",
          animation: "slideUp 0.35s cubic-bezier(.22,1,.36,1)",
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Top banner */}
        <div style={{ background: "var(--green)", padding: "10px 16px" }} className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-white text-xs font-semibold uppercase tracking-wider">
            <Zap size={14} fill="currentColor" /> Live Online · 24–25 Nov 2026
          </span>
          <button
            onClick={dismiss}
            aria-label="Close"
            style={{ color: "rgba(255,255,255,0.75)", background: "none", border: "none", cursor: "pointer", padding: 2, lineHeight: 1 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div>
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-semibold mb-1">Future Options Presents</p>
            <h3 className="text-base font-bold text-[var(--green)] leading-snug">
              Practical AI Bootcamp
            </h3>
            <p className="text-sm text-[var(--muted)] mt-1 leading-relaxed">
              2 days · 5 hands-on modules · No tech background needed. Learn to use AI for writing, data, sales &amp; workflow automation.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-lg font-bold text-[var(--orange)]">UGX 400,000</span>
              <span className="text-xs text-[var(--muted)] ml-1">/ USD 96</span>
            </div>
            <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded-full">Limited spots</span>
          </div>

          <a
            href="https://futureoptions.org/practical-ai-bootcamp/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-accent w-full text-center justify-center"
            style={{ display: "flex" }}
            onClick={dismiss}
          >
            Register Now →
          </a>

          <button
            onClick={dismiss}
            className="w-full text-xs text-[var(--muted)] hover:text-[var(--ink)] text-center pt-1"
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </>
  );
}
