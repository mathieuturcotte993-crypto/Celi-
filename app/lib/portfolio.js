/* ══════════════════════════════════════════════════════════════════ */
/*  Formats                                                            */
/* ══════════════════════════════════════════════════════════════════ */
export const fr = (n, d = 2) =>
  (Math.round(n * 10 ** d) / 10 ** d)
    .toFixed(d)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d),)/g, " ");
export const money = (n, d = 2) => fr(n, d) + " $";
export const pct = (n) => fr(n, 1) + " %";
export const valueOf = (l) => (l.shares || 0) * (l.price || 0);

/* ══════════════════════════════════════════════════════════════════ */
/*  Répartition du dépôt                                               */
/* ══════════════════════════════════════════════════════════════════ */
export function allocate(lines, deposit, minLot) {
  const total = lines.reduce((s, l) => s + valueOf(l), 0);
  const after = total + deposit;
  if (deposit <= 0 || after <= 0) return {};

  let gaps = lines.map((l) => ({
    ticker: l.ticker,
    gap: Math.max(0, (l.target / 100) * after - valueOf(l)),
  }));
  if (gaps.reduce((s, g) => s + g.gap, 0) <= 0) {
    const sumT = lines.reduce((s, l) => s + l.target, 0) || 1;
    gaps = lines.map((l) => ({ ticker: l.ticker, gap: (l.target / sumT) * deposit }));
  }

  let active = gaps.filter((g) => g.gap > 0);
  for (;;) {
    const s = active.reduce((a, g) => a + g.gap, 0);
    if (!s) return {};
    const alloc = active.map((g) => ({ ...g, amt: (g.gap / s) * deposit }));
    const smallest = alloc.reduce((m, a) => (a.amt < m.amt ? a : m), alloc[0]);
    if (alloc.length <= 1 || smallest.amt >= minLot) {
      const out = {};
      alloc.forEach((a) => (out[a.ticker] = Math.round(a.amt * 100) / 100));
      return out;
    }
    active = active.filter((g) => g.ticker !== smallest.ticker);
  }
}

/* ══════════════════════════════════════════════════════════════════ */
/*  Lecture d'un collage texte Wealthsimple                            */
/* ══════════════════════════════════════════════════════════════════ */
export function parsePaste(text) {
  const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const num = (s) => parseFloat(s.replace(/\s/g, "").replace(",", "."));
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    if (!/^[A-Z][A-Z0-9]{0,6}(\.[A-Z]{1,3})?$/.test(rows[i])) continue;
    let shares = null, value = null;
    for (let j = i + 1; j < Math.min(i + 5, rows.length); j++) {
      const sh = rows[j].match(/^([\d\s]+[,.]?\d*)\s*actions?$/i);
      if (sh && shares === null) shares = num(sh[1]);
      const va = rows[j].match(/^([\d\s]+,\d{2})\s*CAD$/i);
      if (va && value === null) value = num(va[1]);
    }
    if (shares > 0 && value > 0) out.push({ ticker: rows[i], shares, price: value / shares });
  }
  return out;
}

/* ══════════════════════════════════════════════════════════════════ */
/*  Calculs dérivés d'un jeu de lignes                                 */
/* ══════════════════════════════════════════════════════════════════ */
export function computeTotals(lines) {
  const total = lines.reduce((s, l) => s + valueOf(l), 0);
  const monthly =
    lines.reduce((s, l) => s + (valueOf(l) * (l.yield || 0)) / 100, 0) / 12;
  const blended = total > 0 ? (monthly * 12 * 100) / total : 0;
  return { total, monthly, blended };
}

/* Estimation grossière de l'économie d'impôt d'une cotisation REER.        */
/* Le taux marginal est fourni par l'utilisateur (aucune API publique ARC). */
export function estimateTaxSavings(deposit, marginalRate) {
  if (!deposit || !marginalRate) return 0;
  return (deposit * marginalRate) / 100;
}
