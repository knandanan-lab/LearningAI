import { useState, useEffect } from "react";
import { X } from "lucide-react";

const SHOW_DELAY = 3000;    // first appearance after 3s
const RESHOW_INTERVAL = 20000; // reappear every 20s if dismissed

export default function BootcampPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = () => setVisible(true);

    // First show
    const first = setTimeout(show, SHOW_DELAY);

    // Reappear every 20s
    const interval = setInterval(show, SHOW_DELAY + RESHOW_INTERVAL);

    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, []);

  function dismiss() {
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <>
      {/* Soft backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)" }}
        onClick={dismiss}
      />

      {/* Popup — centered horizontally, sitting in the middle-ish vertically */}
      <div
        role="dialog"
        aria-label="AI Bootcamp promotion"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 50,
          width: "min(420px, calc(100vw - 32px))",
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.1)",
          animation: "popIn 0.4s cubic-bezier(.22,1,.36,1)",
        }}
      >
        <style>{`
          @keyframes popIn {
            from { opacity: 0; transform: translate(-50%, -44%) scale(0.94); }
            to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
        `}</style>

        {/* Hero banner */}
        <div style={{
          background: "linear-gradient(135deg, #1a4731 0%, #2d7a4a 60%, #3a9e62 100%)",
          padding: "28px 24px 20px",
          position: "relative",
        }}>
          {/* Close */}
          <button
            onClick={dismiss}
            aria-label="Close"
            style={{
              position: "absolute", top: 12, right: 12,
              background: "rgba(255,255,255,0.15)", border: "none",
              borderRadius: "50%", width: 28, height: 28,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "white",
            }}
          >
            <X size={15} />
          </button>

          {/* Badge */}
          <span style={{
            display: "inline-block",
            background: "var(--orange, #e87722)",
            color: "white",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "4px 12px",
            borderRadius: 999,
            marginBottom: 12,
          }}>
            ⚡ Live Online · 24–25 Nov 2026
          </span>

          <h2 style={{
            color: "white",
            fontSize: 22,
            fontWeight: 800,
            lineHeight: 1.2,
            margin: "0 0 6px",
          }}>
            Practical AI Bootcamp
          </h2>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, margin: 0 }}>
            by Future Options Consulting
          </p>
        </div>

        {/* Body */}
        <div style={{ background: "white", padding: "20px 24px 24px" }}>
          {/* What you get */}
          <p style={{ fontSize: 14, color: "#444", lineHeight: 1.6, margin: "0 0 16px" }}>
            2 days · 5 hands-on modules · <strong>No tech background needed.</strong> Master AI for writing, data analysis, sales &amp; workflow automation.
          </p>

          {/* Highlights */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
            {["✍️ Writing & Reports", "📊 Data & Decisions", "⚙️ Automation"].map(tag => (
              <span key={tag} style={{
                fontSize: 12, fontWeight: 600,
                background: "#f0f7f3", color: "#2d7a4a",
                padding: "4px 10px", borderRadius: 999,
              }}>{tag}</span>
            ))}
          </div>

          {/* Price row */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#fafafa", borderRadius: 12, padding: "10px 14px",
            marginBottom: 16, border: "1px solid #eee",
          }}>
            <div>
              <span style={{ fontSize: 20, fontWeight: 800, color: "var(--orange, #e87722)" }}>UGX 400,000</span>
              <span style={{ fontSize: 12, color: "#888", marginLeft: 6 }}>/ USD 96</span>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, color: "#c0392b",
              background: "#fef0ee", padding: "4px 10px", borderRadius: 999,
            }}>Limited spots</span>
          </div>

          {/* CTA */}
          <a
            href="https://futureoptions.org/practical-ai-bootcamp/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            style={{
              display: "block", width: "100%", textAlign: "center",
              background: "linear-gradient(135deg, #e87722, #d4631a)",
              color: "white", fontWeight: 700, fontSize: 15,
              padding: "13px 24px", borderRadius: 12,
              textDecoration: "none", letterSpacing: "0.01em",
              boxShadow: "0 4px 12px rgba(232,119,34,0.35)",
              transition: "opacity 0.15s",
            }}
          >
            Register Now →
          </a>

          <button
            onClick={dismiss}
            style={{
              display: "block", width: "100%", textAlign: "center",
              marginTop: 10, background: "none", border: "none",
              fontSize: 12, color: "#aaa", cursor: "pointer",
            }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </>
  );
}
