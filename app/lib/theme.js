/* ══════════════════════════════════════════════════════════════════ */
/*  Jetons de design — palette "maison de courtage" professionnelle   */
/* ══════════════════════════════════════════════════════════════════ */
export const C = {
  bg: "#F7F7F5",        // fond général
  surface: "#FFFFFF",   // cartes
  surfaceAlt: "#F0F1EC",// zones secondaires (en-tête de tableau, badges)
  ink: "#12161A",       // texte principal
  soft: "#5B6169",       // texte secondaire
  faint: "#9297A0",      // texte tertiaire / labels
  rule: "#E6E7E2",       // bordures
  ruleStrong: "#D7D9D2",
  track: "#ECEDE7",      // pistes de barres
  under: "#0F7A5C",      // sous la cible / positif
  over: "#C24E32",       // au-dessus de la cible / négatif
  accent: "#0F7A5C",     // accent principal (vert "argent")
  accentSoft: "#E4F2EC", // fond doux accent
  gold: "#8A6D2F",
  shadow: "0 1px 2px rgba(18,22,26,.04), 0 4px 16px rgba(18,22,26,.05)",
  shadowLift: "0 2px 4px rgba(18,22,26,.06), 0 10px 30px rgba(18,22,26,.08)",
};

export const SANS =
  "'IBM Plex Sans', ui-sans-serif, system-ui, -apple-system, sans-serif";
export const MONO =
  "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace";

/* Couleurs d'accent par compte — permet de distinguer CELI / REER          */
/* visuellement (pastille, dégradé du bandeau, accent des graphiques).      */
export const ACCOUNT_ACCENTS = {
  celi: { accent: "#0F7A5C", soft: "#E4F2EC" }, // vert
  reer: { accent: "#2D5FA8", soft: "#E7EDF7" }, // bleu
};

/* Palette fixe pour le donut de répartition (régions / rôles).             */
export const DONUT_COLORS = [
  "#0F7A5C", "#2D5FA8", "#C89B3C", "#8B5CF6", "#C24E32",
  "#4C9A8F", "#6B7280", "#B5533C", "#3F7CAC", "#9C7A2C",
];
