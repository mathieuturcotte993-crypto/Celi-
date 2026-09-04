import { C } from "../lib/theme";

/**
 * Petite courbe d'évolution — utilisée pour l'historique du revenu mensuel
 * et de la valeur totale. `points` = [{ v: number }], le plus ancien en premier.
 */
export default function Sparkline({ points, width = 640, height = 84, color = C.accent }) {
  if (!points || points.length < 2) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height, color: C.faint, fontSize: 12.5,
      }}>
        L'historique s'affichera ici après quelques mises à jour.
      </div>
    );
  }
  const values = points.map((p) => p.v);
  const min = Math.min(...values), max = Math.max(...values);
  const pad = (max - min) * 0.12 || Math.max(1, max * 0.1);
  const lo = min - pad, hi = max + pad;
  const range = hi - lo || 1;

  const x = (i) => (i / (points.length - 1)) * width;
  const y = (v) => height - ((v - lo) / range) * height;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.16" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkFill)" stroke="none" />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1].v)} r={3.5} fill={color} />
    </svg>
  );
}
