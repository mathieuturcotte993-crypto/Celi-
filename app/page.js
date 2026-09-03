"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";

/* ══════════════════════════════════════════════════════════════════ */
/*  Jetons de design                                                  */
/* ══════════════════════════════════════════════════════════════════ */
const C = {
  paper: "#F3F4F0",
  surface: "#FFFFFF",
  ink: "#16211D",
  soft: "#5C6862",
  faint: "#8B958F",
  rule: "#DCDFD7",
  track: "#E6E9E2",
  under: "#2E6B58",
  over: "#9C4A38",
  gold: "#8A6D2F",
};
const SANS = "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace";

/* ══════════════════════════════════════════════════════════════════ */
/*  Portefeuille cible                                                */
/* ══════════════════════════════════════════════════════════════════ */
const DEFAULT_LINES = [
  { ticker: "VDY",    role: "Cœur canadien",       target: 15, shares: 0,  price: 76.97, yield: 4.3,  region: "CA",   cc: false },
  { ticker: "ZDI",    role: "International",       target: 14, shares: 0,  price: 32.58, yield: 4.5,  region: "INT",  cc: false },
  { ticker: "XEQT",   role: "Croissance mondiale", target: 12, shares: 0,  price: 45.40, yield: 1.7,  region: "MOND", cc: false },
  { ticker: "ZWC",    role: "Revenu mensuel CA",   target: 11, shares: 0,  price: 22.73, yield: 6.8,  region: "CA",   cc: true  },
  { ticker: "HHL",    role: "Santé mondiale",      target: 11, shares: 0, price: 7.54,  yield: 8.0,  region: "MOND", cc: true  },
  { ticker: "ZMMK",   role: "Réserve",             target: 10, shares: 0,       price: 49.84, yield: 3.0,  region: "CA",   cc: false },
  { ticker: "ZRE",    role: "Immobilier",          target: 8,  shares: 0,       price: 23.00, yield: 4.3,  region: "CA",   cc: false },
  { ticker: "ZUT",    role: "Services publics",    target: 7,  shares: 0,       price: 27.91, yield: 4.0,  region: "CA",   cc: false },
  { ticker: "ENB.TO", role: "Pipeline",            target: 6,  shares: 0,   price: 69.53, yield: 6.0,  region: "CA",   cc: false },
  { ticker: "HDIV",   role: "Revenu à levier",     target: 3,  shares: 0,   price: 23.63, yield: 10.5, region: "CA",   cc: true  },
  { ticker: "AMAX",   role: "Or",                  target: 3,  shares: 0,  price: 36.42, yield: 12.0, region: "MOND", cc: true  },
];
const STORAGE_KEY = "celi-tracker-v2";
const MODEL = "claude-sonnet-5";

/* Stockage local du navigateur, avec la meme interface que window.storage. */
const store = {
  async get(k) {
    if (typeof window === "undefined") return null;
    const v = window.localStorage.getItem(k);
    return v === null ? null : { key: k, value: v };
  },
  async set(k, v) {
    if (typeof window === "undefined") return null;
    window.localStorage.setItem(k, v);
    return { key: k, value: v };
  },
};

/* ══════════════════════════════════════════════════════════════════ */
/*  Formats                                                           */
/* ══════════════════════════════════════════════════════════════════ */
const fr = (n, d = 2) =>
  (Math.round(n * 10 ** d) / 10 ** d)
    .toFixed(d)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d),)/g, " ");
const money = (n, d = 2) => fr(n, d) + " $";
const pct = (n) => fr(n, 1) + " %";
const valueOf = (l) => (l.shares || 0) * (l.price || 0);

/* ══════════════════════════════════════════════════════════════════ */
/*  Répartition du dépôt                                              */
/* ══════════════════════════════════════════════════════════════════ */
function allocate(lines, deposit, minLot) {
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
/*  Lecture d'un collage texte Wealthsimple                           */
/* ══════════════════════════════════════════════════════════════════ */
function parsePaste(text) {
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
/*  Composants                                                        */
/* ══════════════════════════════════════════════════════════════════ */
function GapBar({ actual, target }) {
  const scale = Math.max(actual, target, 1) * 1.28;
  const over = actual > target + 0.05;
  return (
    <div style={{ position: "relative", height: 9, background: C.track, borderRadius: 5 }}>
      <div style={{
        position: "absolute", top: 0, left: 0, height: "100%",
        width: `${(actual / scale) * 100}%`,
        background: over ? C.over : C.under,
        borderRadius: 5, transition: "width .45s cubic-bezier(.4,0,.2,1)",
      }} />
      <div style={{
        position: "absolute", left: `${(target / scale) * 100}%`, top: -3.5,
        width: 2, height: 16, background: C.ink, borderRadius: 1,
      }} />
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: C.faint, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 15, fontVariantNumeric: "tabular-nums", color: tone || C.ink }}>
        {value}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export default function App() {
  const [lines, setLines] = useState(DEFAULT_LINES);
  const [deposit, setDeposit] = useState(280);
  const [minLot, setMinLot] = useState(50);
  const [stamp, setStamp] = useState(null);
  const [tab, setTab] = useState("depot");
  const [paste, setPaste] = useState("");
  const [pasteNote, setPasteNote] = useState("");
  const [imgPreview, setImgPreview] = useState(null);
  const [busy, setBusy] = useState(null); // 'img' | 'quotes'
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const linesRef = useRef(lines);
  linesRef.current = lines;

  /* ---- persistance ---- */
  useEffect(() => {
    (async () => {
      try {
        const r = await store.get(STORAGE_KEY);
        if (r?.value) {
          const d = JSON.parse(r.value);
          if (d.lines?.length) setLines(d.lines);
          if (typeof d.deposit === "number") setDeposit(d.deposit);
          if (typeof d.minLot === "number") setMinLot(d.minLot);
          if (d.stamp) setStamp(d.stamp);
        }
      } catch { /* première ouverture */ }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    store.set(STORAGE_KEY, JSON.stringify({ lines, deposit, minLot, stamp })).catch(() => {});
  }, [lines, deposit, minLot, stamp, loading]);

  /* ---- coller une image ---- */
  useEffect(() => {
    const onPaste = (e) => {
      const it = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
      if (it) { e.preventDefault(); readImage(it.getAsFile()); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  /* ---- calculs ---- */
  const total = useMemo(() => lines.reduce((s, l) => s + valueOf(l), 0), [lines]);
  const monthly = useMemo(
    () => lines.reduce((s, l) => s + (valueOf(l) * (l.yield || 0)) / 100, 0) / 12,
    [lines]
  );
  const blended = total > 0 ? (monthly * 12 * 100) / total : 0;
  const plan = useMemo(() => allocate(lines, deposit, minLot), [lines, deposit, minLot]);
  const mix = useMemo(() => {
    const t = total || 1;
    const s = (f) => (lines.filter(f).reduce((a, l) => a + valueOf(l), 0) / t) * 100;
    return { ca: s((l) => l.region === "CA"), cc: s((l) => l.cc) };
  }, [lines, total]);

  const ordered = useMemo(
    () =>
      lines
        .map((l) => ({ ...l, value: valueOf(l), actual: total > 0 ? (valueOf(l) / total) * 100 : 0 }))
        .sort((a, b) => a.actual - a.target - (b.actual - b.target)),
    [lines, total]
  );

  const setLine = (t, patch) => setLines((ls) => ls.map((l) => (l.ticker === t ? { ...l, ...patch } : l)));

  const applyRows = (found) => {
    const base = (t) => String(t).replace(/\..*$/, "").toUpperCase();
    let m = 0, a = 0;
    const next = [...linesRef.current];
    found.forEach((f) => {
      const i = next.findIndex((l) => base(l.ticker) === base(f.ticker));
      if (i >= 0) { next[i] = { ...next[i], ...f, ticker: next[i].ticker }; m++; }
      else { next.push({ role: "Ajoutée automatiquement", target: 0, yield: 0, region: "CA", cc: false, ...f }); a++; }
    });
    setLines(next);
    setStamp(Date.now());
    return `${m} ligne${m > 1 ? "s" : ""} à jour${a ? `, ${a} ajoutée${a > 1 ? "s" : ""}` : ""}.`;
  };

  const applyPaste = () => {
    const f = parsePaste(paste);
    if (!f.length) { setPasteNote("Aucune ligne reconnue dans ce texte."); return; }
    setPasteNote(applyRows(f));
    setPaste("");
  };

  /* ---- lecture d'une capture ---- */
  const readImage = async (file) => {
    if (!file?.type?.startsWith("image/")) return;
    setBusy("img"); setNote("Lecture de la capture…"); setImgPreview(URL.createObjectURL(file));
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(",")[1]);
        r.onerror = () => rej(new Error());
        r.readAsDataURL(file);
      });
      const resp = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1000,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: file.type === "image/png" ? "image/png" : "image/jpeg", data: b64 } },
            { type: "text", text:
              "Capture de l'écran « Titres détenus » de Wealthsimple. Pour chaque titre, relève le symbole, le nombre de parts et la valeur en dollars. Virgule décimale française, espace comme séparateur de milliers. Réponds UNIQUEMENT avec un tableau JSON sans markdown, format [{\"ticker\":\"ENB.TO\",\"shares\":2.083,\"value\":144.83}]" },
          ] }],
        }),
      });
      const d = await resp.json();
      const txt = (d.content || []).filter((c) => c.type === "text").map((c) => c.text).join("").replace(/```json|```/g, "").trim();
      const rows = JSON.parse(txt)
        .filter((r) => r?.ticker && r.shares > 0 && r.value > 0)
        .map((r) => ({ ticker: String(r.ticker).toUpperCase(), shares: +r.shares, price: +r.value / +r.shares }));
      setNote(rows.length ? applyRows(rows) : "Aucun titre lisible sur cette capture.");
    } catch {
      setNote("Lecture impossible. Vérifie que la capture montre l'écran « Titres détenus ».");
    }
    setBusy(null);
  };

  /* ---- cours du jour ---- */
  const refreshQuotes = async () => {
    setBusy("quotes"); setNote("Recherche des cours…");
    try {
      const syms = linesRef.current.map((l) => (l.ticker.includes(".") ? l.ticker : l.ticker + ".TO"));
      const resp = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content:
            `Trouve le cours le plus récent en dollars canadiens de ces titres à la Bourse de Toronto : ${syms.join(", ")}. ` +
            `Réponds UNIQUEMENT avec un objet JSON, sans markdown ni texte autour, associant chaque symbole sans suffixe à son prix. Exemple : {"VDY":76.97,"ENB":69.53}` }],
        }),
      });
      const d = await resp.json();
      const txt = (d.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
      const m = txt.match(/\{[\s\S]*\}/);
      if (!m) throw new Error();
      const quotes = JSON.parse(m[0]);
      let hits = 0;
      setLines((ls) => ls.map((l) => {
        const k = l.ticker.replace(/\..*$/, "").toUpperCase();
        const p = quotes[k] ?? quotes[l.ticker];
        if (typeof p === "number" && p > 0) { hits++; return { ...l, price: p }; }
        return l;
      }));
      setStamp(Date.now());
      setNote(hits ? `${hits} cours mis à jour.` : "Aucun cours trouvé. Réessaie dans un moment.");
    } catch {
      setNote("Les cours n'ont pas pu être récupérés. Réessaie dans un moment.");
    }
    setBusy(null);
  };

  /* ---- styles ---- */
  const S = {
    card: { background: C.surface, border: `1px solid ${C.rule}`, borderRadius: 8, padding: 20 },
    label: { fontSize: 11.5, color: C.faint },
    num: { fontFamily: MONO, fontVariantNumeric: "tabular-nums" },
    input: {
      fontFamily: MONO, border: `1px solid ${C.rule}`, borderRadius: 5,
      padding: "7px 9px", background: C.surface, color: C.ink, width: "100%", fontSize: 13,
    },
    tab: (on) => ({
      padding: "10px 2px", marginRight: 20, border: "none", background: "transparent",
      borderBottom: `2px solid ${on ? C.ink : "transparent"}`,
      color: on ? C.ink : C.faint, fontFamily: SANS, fontSize: 14,
      fontWeight: on ? 600 : 450, cursor: "pointer",
    }),
    btn: (primary) => ({
      background: primary ? C.ink : "transparent",
      color: primary ? C.paper : C.ink,
      border: primary ? "none" : `1px solid ${C.ink}`,
      borderRadius: 5, padding: "9px 16px", fontFamily: SANS, fontSize: 13.5,
      cursor: "pointer", whiteSpace: "nowrap",
    }),
  };

  if (loading)
    return <div style={{ fontFamily: SANS, background: C.paper, color: C.faint, padding: 44 }}>Chargement…</div>;

  const when = stamp
    ? new Date(stamp).toLocaleString("fr-CA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "jamais";

  return (
    <div style={{ background: C.paper, color: C.ink, fontFamily: SANS, minHeight: "100%" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;450;500;600&display=swap');
        *{box-sizing:border-box}
        button:focus-visible,input:focus-visible,textarea:focus-visible,label:focus-within{outline:2px solid ${C.under};outline-offset:2px}
        input[type=number]{-moz-appearance:textfield}
        input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
        .busy{animation:pulse 1.1s ease-in-out infinite}
        @media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}`}</style>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "26px 18px 64px" }}>

        {/* ── En-tête ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: C.faint, marginBottom: 5 }}>Revenu mensuel estimé</div>
            <div style={{ ...S.num, fontSize: 38, fontWeight: 500, lineHeight: 1 }}>{money(monthly)}</div>
            <div style={{ fontSize: 12.5, color: C.soft, marginTop: 7 }}>
              {money(total)} placés · {pct(blended)} de rendement
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <button
              onClick={refreshQuotes}
              disabled={!!busy}
              className={busy === "quotes" ? "busy" : ""}
              style={{ ...S.btn(false), opacity: busy ? 0.55 : 1 }}
            >
              {busy === "quotes" ? "Recherche…" : "Cours du jour"}
            </button>
            <div style={{ ...S.label, marginTop: 7 }}>mis à jour {when}</div>
          </div>
        </div>

        {/* ── Onglets ── */}
        <div style={{ display: "flex", borderBottom: `1px solid ${C.rule}`, margin: "24px 0 22px" }}>
          {[["depot", "Prochain dépôt"], ["lignes", "Mes lignes"], ["donnees", "Mettre à jour"]].map(([k, t]) => (
            <button key={k} onClick={() => setTab(k)} style={S.tab(tab === k)}>{t}</button>
          ))}
        </div>

        {/* ══ Dépôt ══ */}
        {tab === "depot" && (
          <>
            <div style={{ ...S.card, marginBottom: 14 }}>
              <div style={S.label}>Combien tu déposes</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <input type="number" value={deposit}
                  onChange={(e) => setDeposit(parseFloat(e.target.value) || 0)}
                  style={{ ...S.input, fontSize: 32, fontWeight: 500, padding: "5px 10px", width: 172 }} />
                <span style={{ fontSize: 25, color: C.faint }}>$</span>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={S.label}>minimum par ligne</div>
                  <input type="number" value={minLot}
                    onChange={(e) => setMinLot(parseFloat(e.target.value) || 0)}
                    style={{ ...S.input, width: 74, padding: "4px 7px", marginTop: 3, textAlign: "right" }} />
                </div>
              </div>
            </div>

            <div style={S.card}>
              <div style={{ ...S.label, marginBottom: 4 }}>Où mettre l'argent</div>
              <div style={{ fontSize: 12.5, color: C.soft, marginBottom: 16 }}>
                Les lignes les plus loin de leur cible d'abord. Les parts sous {money(minLot, 0)} sont
                redistribuées plutôt que saupoudrées.
              </div>
              {!Object.keys(plan).length && (
                <div style={{ color: C.faint, fontSize: 13.5 }}>Entre un montant pour voir la répartition.</div>
              )}
              {ordered.filter((l) => plan[l.ticker]).sort((a, b) => plan[b.ticker] - plan[a.ticker]).map((l, i, arr) => (
                <div key={l.ticker} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "13px 0", borderBottom: i === arr.length - 1 ? "none" : `1px solid ${C.rule}`,
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{l.ticker}</div>
                    <div style={{ ...S.label, marginTop: 2 }}>
                      {l.role} · {pct(l.actual)} vers {l.target} %
                    </div>
                  </div>
                  <div style={{ ...S.num, fontSize: 21, color: C.under }}>{money(plan[l.ticker])}</div>
                </div>
              ))}
              <div style={{
                display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 13,
                borderTop: `1px solid ${C.rule}`, fontSize: 12.5, color: C.soft,
              }}>
                <span>Total réparti</span>
                <span style={S.num}>{money(Object.values(plan).reduce((s, v) => s + v, 0))}</span>
              </div>
            </div>
          </>
        )}

        {/* ══ Lignes ══ */}
        {tab === "lignes" && (
          <>
            <div style={{
              ...S.card, marginBottom: 14, display: "grid",
              gridTemplateColumns: "repeat(3,1fr)", gap: 14,
            }}>
              <Stat label="Canada" value={pct(mix.ca)} tone={mix.ca > 58 ? C.over : C.ink} />
              <Stat label="Covered call" value={pct(mix.cc)} tone={mix.cc > 32 ? C.over : C.ink} />
              <Stat label="Lignes" value={String(lines.length)} />
            </div>

            <div style={S.card}>
              <div style={{ fontSize: 12.5, color: C.soft, marginBottom: 18 }}>
                Le trait vertical marque la cible. Vert sous la cible, rouge au-dessus.
              </div>
              {ordered.map((l, i) => {
                const d = l.actual - l.target;
                return (
                  <div key={l.ticker} style={{
                    padding: "14px 0",
                    borderBottom: i === ordered.length - 1 ? "none" : `1px solid ${C.rule}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 14.5 }}>{l.ticker}</span>
                        <span style={{ ...S.label, marginLeft: 9 }}>{l.role}</span>
                      </div>
                      <div style={{ ...S.num, fontSize: 14 }}>{money(l.value)}</div>
                    </div>
                    <GapBar actual={l.actual} target={l.target} />
                    <div style={{
                      display: "flex", justifyContent: "space-between", marginTop: 8,
                      fontSize: 11.5, color: C.faint,
                    }}>
                      <span style={S.num}>
                        {fr(l.shares, 4)} parts × {money(l.price)} · {pct(l.yield)} rend.
                      </span>
                      <span style={{ ...S.num, color: Math.abs(d) < 1 ? C.faint : d > 0 ? C.over : C.under }}>
                        {d > 0 ? "+" : ""}{fr(d, 1)} pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ══ Données ══ */}
        {tab === "donnees" && (
          <>
            <div style={{ ...S.card, marginBottom: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Importer une capture</div>
              <div style={{ fontSize: 12.5, color: C.soft, margin: "5px 0 14px" }}>
                Capture l'écran « Titres détenus ». Les parts et les valeurs sont lues automatiquement.
              </div>
              <label
                className={busy === "img" ? "busy" : ""}
                style={{
                  display: "block", border: `1px dashed ${C.rule}`, borderRadius: 6,
                  padding: "26px 16px", textAlign: "center",
                  cursor: busy ? "wait" : "pointer", background: C.paper,
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); readImage(e.dataTransfer.files[0]); }}
              >
                <input type="file" accept="image/*" disabled={!!busy}
                  onChange={(e) => readImage(e.target.files[0])} style={{ display: "none" }} />
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {busy === "img" ? "Lecture en cours…" : "Choisir une capture"}
                </div>
                <div style={{ ...S.label, marginTop: 5 }}>ou glisse l'image, ou colle-la avec Ctrl+V</div>
              </label>

              {(imgPreview || note) && (
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 14 }}>
                  {imgPreview && (
                    <img src={imgPreview} alt="Capture importée" style={{
                      width: 46, height: 46, objectFit: "cover", objectPosition: "top",
                      border: `1px solid ${C.rule}`, borderRadius: 5,
                    }} />
                  )}
                  <span style={{ fontSize: 12.5, color: C.soft }}>{note}</span>
                </div>
              )}
            </div>

            <div style={{ ...S.card, marginBottom: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Coller le texte</div>
              <div style={{ fontSize: 12.5, color: C.soft, margin: "5px 0 12px" }}>
                Solution de rechange si la capture ne passe pas.
              </div>
              <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={5}
                placeholder={"ENB.TO\n2,083 actions\n144,83 CAD"}
                style={{ ...S.input, resize: "vertical", lineHeight: 1.5 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 11 }}>
                <button onClick={applyPaste} style={S.btn(true)}>Lire le collage</button>
                {pasteNote && <span style={{ fontSize: 12.5, color: C.soft }}>{pasteNote}</span>}
              </div>
            </div>

            <div style={S.card}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Ajuster à la main</div>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 78px 74px 56px 56px",
                gap: 7, ...S.label, marginBottom: 6,
              }}>
                <span /><span>parts</span><span>prix</span><span>cible</span><span>rend.</span>
              </div>
              {lines.map((l) => (
                <div key={l.ticker} style={{
                  display: "grid", gridTemplateColumns: "1fr 78px 74px 56px 56px", gap: 7,
                  alignItems: "center", padding: "6px 0", borderTop: `1px solid ${C.rule}`,
                }}>
                  <span style={{ fontSize: 13.5, fontWeight: 500 }}>{l.ticker}</span>
                  <input type="number" step="0.0001" value={l.shares} aria-label={`Parts ${l.ticker}`}
                    onChange={(e) => setLine(l.ticker, { shares: parseFloat(e.target.value) || 0 })}
                    style={{ ...S.input, fontSize: 12, padding: "5px 6px" }} />
                  <input type="number" step="0.01" value={l.price} aria-label={`Prix ${l.ticker}`}
                    onChange={(e) => setLine(l.ticker, { price: parseFloat(e.target.value) || 0 })}
                    style={{ ...S.input, fontSize: 12, padding: "5px 6px" }} />
                  <input type="number" value={l.target} aria-label={`Cible ${l.ticker}`}
                    onChange={(e) => setLine(l.ticker, { target: parseFloat(e.target.value) || 0 })}
                    style={{ ...S.input, fontSize: 12, padding: "5px 6px" }} />
                  <input type="number" step="0.1" value={l.yield} aria-label={`Rendement ${l.ticker}`}
                    onChange={(e) => setLine(l.ticker, { yield: parseFloat(e.target.value) || 0 })}
                    style={{ ...S.input, fontSize: 12, padding: "5px 6px" }} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
