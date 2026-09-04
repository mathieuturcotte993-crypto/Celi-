import { C, SANS } from "../lib/theme";

export function GapBar({ actual, target, color }) {
  const scale = Math.max(actual, target, 1) * 1.28;
  const over = actual > target + 0.05;
  const fill = color || (over ? C.over : C.under);
  return (
    <div style={{ position: "relative", height: 8, background: C.track, borderRadius: 5 }}>
      <div style={{
        position: "absolute", top: 0, left: 0, height: "100%",
        width: `${(actual / scale) * 100}%`,
        background: fill,
        borderRadius: 5, transition: "width .45s cubic-bezier(.4,0,.2,1)",
      }} />
      <div style={{
        position: "absolute", left: `${(target / scale) * 100}%`, top: -3,
        width: 2, height: 14, background: C.ink, borderRadius: 1, opacity: 0.55,
      }} />
    </div>
  );
}

export function Stat({ label, value, tone, sub }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: C.faint, marginBottom: 3, fontWeight: 500, letterSpacing: 0.2 }}>{label}</div>
      <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 16, fontVariantNumeric: "tabular-nums", color: tone || C.ink, fontWeight: 500 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/** Contrôle segmenté style "pilule" — utilisé pour le sélecteur de compte et les onglets. */
export function Segmented({ options, value, onChange, size = "md" }) {
  const pad = size === "sm" ? "6px 12px" : "8px 16px";
  const fontSize = size === "sm" ? 12.5 : 13.5;
  return (
    <div style={{
      display: "inline-flex", background: C.surfaceAlt, borderRadius: 999,
      padding: 3, gap: 2,
    }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              border: "none", borderRadius: 999, padding: pad, fontFamily: SANS,
              fontSize, fontWeight: on ? 600 : 500, cursor: "pointer",
              background: on ? C.surface : "transparent",
              color: on ? C.ink : C.faint,
              boxShadow: on ? "0 1px 3px rgba(18,22,26,.10)" : "none",
              display: "flex", alignItems: "center", gap: 6,
              transition: "all .15s ease",
            }}
          >
            {o.dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: o.dot }} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Card({ children, style, padded = true }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.rule}`, borderRadius: 14,
      padding: padded ? 22 : 0, boxShadow: C.shadow, ...style,
    }}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: C.surfaceAlt, fg: C.soft },
    good: { bg: "#E4F2EC", fg: C.under },
    warn: { bg: "#FBEAE5", fg: C.over },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      background: t.bg, color: t.fg, fontSize: 11, fontWeight: 600,
      padding: "3px 8px", borderRadius: 999, letterSpacing: 0.2,
    }}>
      {children}
    </span>
  );
}

/** Notification non bloquante, empilée en bas à droite. */
export function ToastStack({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, display: "flex",
      flexDirection: "column", gap: 8, zIndex: 50, maxWidth: 320,
    }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          background: C.ink, color: C.bg, padding: "11px 14px", borderRadius: 10,
          fontSize: 13, fontFamily: SANS, boxShadow: C.shadowLift,
          display: "flex", alignItems: "center", gap: 8,
          animation: "toastIn .25s ease",
        }}>
          {t.tone === "error" ? "⚠" : "✓"} <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
