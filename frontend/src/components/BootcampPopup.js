import { useState, useEffect } from "react";
import { X } from "lucide-react";

const SHOW_DELAY = 3000;
const RESHOW_INTERVAL = 20000;

export default function BootcampPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = () => setVisible(true);
    const first = setTimeout(show, SHOW_DELAY);
    const interval = setInterval(show, SHOW_DELAY + RESHOW_INTERVAL);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, []);

  function dismiss() { setVisible(false); }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="AI Bootcamp promotion"
      style={{
        position: "fixed",
        top: "50%",
        right: 20,
        transform: "translateY(-50%)",
        zIndex: 50,
        width: "min(300px, calc(100vw - 32px))",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 16px 48px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
        animation: "slideIn 0.4s cubic-bezier(.22,1,.36,1)",
      }}
    >
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-50%) translateX(40px); }
          to   { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
      `}</style>

      {/* Green header */}
      <div style={{
        background: "linear-gradient(135deg, #1a4731 0%, #2d7a4a 60%, #3a9e62 100%)",
        padding: "18px 16px 14px",
        position: "relative",
      }}>
        <button
          onClick={dismiss}
          aria-label="Close"
          style={{
            position: "absolute", top: 10, right: 10,
            background: "rgba(255,255,255,0.15)", border: "none",
            borderRadius: "50%", width: 24, height: 24,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "white",
          }}
        >
          <X size={13} />
        </button>

        <span style={{
          display: "inline-block",
          background: "var(--orange, #e87722)",
          color: "white", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.08em", textTransform: "uppercase",
          padding: "3px 10px", borderRadius: 999, marginBottom: 10,
        }}>
          ⚡ 24–25 Nov 2026 · Live Online
        </span>

        <h3 style={{ color: "white", fontSize: 17, fontWeight: 800, lineHeight: 1.25, margin: "0 0 4px" }}>
          Practical AI Bootcamp
        </h3>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, margin: 0 }}>
          by Future Options Consulting
        </p>
      </div>

      {/* Body */}
      <div style={{ background: "white", padding: "14px 16px 18px" }}>
        <p style={{ fontSize: 13, color: "#555", lineHeight: 1.55, margin: "0 0 12px" }}>
          2 days · 5 modules · <strong>No tech background needed.</strong> AI for writing, data, sales &amp; automation.
        </p>

        {/* Price */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#fafafa", borderRadius: 10, padding: "8px 12px",
          marginBottom: 12, border: "1px solid #eee",
        }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: "var(--orange, #e87722)" }}>
            UGX 400,000
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, color: "#c0392b",
            background: "#fef0ee", padding: "3px 8px", borderRadius: 999,
          }}>Limited spots</span>
        </div>

        {/* CTA */}
        <a
          href="https://futureoptions.org/practical-ai-bootcamp/"
          target="_blank"
          rel="noopener noreferrer"
          onClick={dismiss}
          style={{
            display: "block", textAlign: "center",
            background: "linear-gradient(135deg, #e87722, #d4631a)",
            color: "white", fontWeight: 700, fontSize: 14,
            padding: "11px 20px", borderRadius: 10,
            textDecoration: "none",
            boxShadow: "0 4px 12px rgba(232,119,34,0.3)",
          }}
        >
          Register Now →
        </a>

        <button
          onClick={dismiss}
          style={{
            display: "block", width: "100%", textAlign: "center",
            marginTop: 8, background: "none", border: "none",
            fontSize: 11, color: "#bbb", cursor: "pointer",
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
