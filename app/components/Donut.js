import { C, DONUT_COLORS } from "../lib/theme";

/**
 * Anneau de répartition. `slices` = [{ label, value }], value en dollars.
 * Rendu en SVG pur (aucune dépendance de charting).
 */
export default function Donut({ slices, size = 132, thickness = 16, centerLabel, centerValue }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;

  let offset = 0;
  const arcs = total > 0 ? slices.filter((s) => s.value > 0).map((s, i) => {
    const frac = s.value / total;
    const dash = frac * circ;
    const arc = (
      <circle
        key={s.label}
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
        strokeWidth={thickness}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={-offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        strokeLinecap="butt"
      />
    );
    offset += dash;
    return arc;
  }) : [];

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.track} strokeWidth={thickness} />
        {arcs}
      </svg>
      {(centerLabel || centerValue) && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", textAlign: "center",
        }}>
          {centerValue && <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 16, fontWeight: 600, color: C.ink }}>{centerValue}</div>}
          {centerLabel && <div style={{ fontSize: 10.5, color: C.faint, marginTop: 1 }}>{centerLabel}</div>}
        </div>
      )}
    </div>
  );
}

export function DonutLegend({ slices }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
      {slices.filter((s) => s.value > 0).map((s, i) => (
        <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
          <span style={{
            width: 8, height: 8, borderRadius: 2, flexShrink: 0,
            background: DONUT_COLORS[i % DONUT_COLORS.length],
          }} />
          <span style={{ color: C.soft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
          <span style={{ marginLeft: "auto", fontFamily: "IBM Plex Mono, monospace", color: C.ink, fontSize: 12 }}>
            {Math.round((s.value / total) * 100)} %
          </span>
        </div>
      ))}
    </div>
  );
}
