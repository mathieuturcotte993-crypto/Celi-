"use client";

import React, { useEffect, useMemo, useState } from "react";
import { C, SANS, MONO, ACCOUNT_ACCENTS } from "./lib/theme";
import { ACCOUNTS, ACCOUNT_ORDER } from "./lib/accounts";
import { fr, money, pct, valueOf, allocate, parsePaste, estimateTaxSavings, filterHistory, HISTORY_PERIODS } from "./lib/portfolio";
import { usePortfolio } from "./hooks/usePortfolio";
import { GapBar, Stat, Segmented, Card, ToastStack } from "./components/ui";
import Donut, { DonutLegend } from "./components/Donut";
import Sparkline from "./components/Sparkline";

const MODEL = "claude-sonnet-5";

/* Sélectionne tout le contenu au focus : évite d'avoir à effacer le 0    */
/* existant avant de taper une nouvelle valeur dans un champ numérique.   */
const selectOnFocus = (e) => e.target.select();

/* ══════════════════════════════════════════════════════════════════ */
/*  Racine — gère les deux comptes et la vue combinée                  */
/* ══════════════════════════════════════════════════════════════════ */
export default function App() {
  const celi = usePortfolio("celi");
  const reer = usePortfolio("reer");
  const [account, setAccount] = useState("celi"); // 'celi' | 'reer' | 'ensemble'
  const [toasts, setToasts] = useState([]);

  const pushToast = (text, tone = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  };

  if (!celi.ready || !reer.ready) {
    return (
      <div style={{ fontFamily: SANS, background: C.bg, color: C.faint, padding: 44, minHeight: "100%" }}>
        Chargement…
      </div>
    );
  }

  const combinedTotal = celi.totals.total + reer.totals.total;
  const combinedMonthly = celi.totals.monthly + reer.totals.monthly;
  const combinedBlended = combinedTotal > 0 ? (combinedMonthly * 12 * 100) / combinedTotal : 0;

  const active = account === "celi" ? celi : account === "reer" ? reer : null;
  const accentInfo = account === "ensemble" ? { accent: C.ink, soft: C.surfaceAlt } : ACCOUNT_ACCENTS[account];

  return (
    <div style={{ background: C.bg, color: C.ink, fontFamily: SANS, minHeight: "100%" }}>
      <GlobalStyle />
      <ToastStack toasts={toasts} />

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "28px 18px 72px" }}>

        {/* ── En-tête / marque ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, background: C.ink,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: C.bg, fontFamily: MONO, fontWeight: 600, fontSize: 13,
            }}>P</div>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.1 }}>Portefeuille</div>
          </div>
          <Segmented
            value={account}
            onChange={setAccount}
            options={[
              { value: "celi", label: "CELI", dot: ACCOUNT_ACCENTS.celi.accent },
              { value: "reer", label: "REER", dot: ACCOUNT_ACCENTS.reer.accent },
              { value: "ensemble", label: "Ensemble" },
            ]}
          />
        </div>

        {account === "ensemble" ? (
          <EnsembleView celi={celi} reer={reer} combinedTotal={combinedTotal} combinedMonthly={combinedMonthly} combinedBlended={combinedBlended} />
        ) : (
          <AccountView
            key={account}
            accountId={account}
            portfolio={active}
            accent={accentInfo}
            pushToast={pushToast}
          />
        )}
      </div>
    </div>
  );
}

function GlobalStyle() {
  return (
    <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;450;500;600;700&display=swap');
      *{box-sizing:border-box}
      button:focus-visible,input:focus-visible,textarea:focus-visible,label:focus-within{outline:2px solid ${C.accent};outline-offset:2px}
      input[type=number]{-moz-appearance:textfield}
      input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
      @keyframes toastIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      .busy{animation:pulse 1.1s ease-in-out infinite}
      @media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
      ::selection{background:${C.accentSoft}}
      .manual-field-label{display:none}
      @media (max-width:560px){
        .hide-mobile{display:none!important}
        .stack-mobile{grid-template-columns:1fr!important}
        .manual-header{display:none!important}
        .manual-row{grid-template-columns:1fr 1fr!important;row-gap:8px!important}
        .manual-ticker{grid-column:1/-1;font-size:14px!important}
        .manual-field-label{display:block;font-size:10px;color:${C.faint};margin-bottom:3px}
      }
    `}</style>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  Vue combinée — lecture seule, agrège CELI + REER                   */
/* ══════════════════════════════════════════════════════════════════ */
function EnsembleView({ celi, reer, combinedTotal, combinedMonthly, combinedBlended }) {
  const [histPeriod, setHistPeriod] = useState("mois");
  const regionSlices = useMemo(() => {
    const all = [...celi.lines, ...reer.lines];
    const byRegion = {};
    all.forEach((l) => { byRegion[l.region] = (byRegion[l.region] || 0) + valueOf(l); });
    const labels = { CA: "Canada", INT: "International", MOND: "Mondial" };
    return Object.entries(byRegion).map(([k, v]) => ({ label: labels[k] || k, value: v }));
  }, [celi.lines, reer.lines]);

  const accountSlices = [
    { label: "CELI", value: celi.totals.total },
    { label: "REER", value: reer.totals.total },
  ];

  const historyCombined = useMemo(() => {
    // filtre chaque compte selon la période choisie, puis aligne par index
    // (approximatif — les deux comptes ne sont pas forcément mis à jour aux
    // mêmes instants — mais suffisant pour donner une tendance).
    const c = filterHistory(celi.history, histPeriod);
    const r = filterHistory(reer.history, histPeriod);
    const n = Math.max(c.length, r.length);
    if (n < 2) return null;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const cv = c[c.length - n + i]?.monthly ?? c[c.length - 1]?.monthly ?? 0;
      const rv = r[r.length - n + i]?.monthly ?? r[r.length - 1]?.monthly ?? 0;
      pts.push({ v: cv + rv });
    }
    return pts;
  }, [celi.history, reer.history, histPeriod]);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: C.faint, marginBottom: 5 }}>Revenu mensuel estimé — combiné</div>
        <div style={{ fontFamily: MONO, fontSize: 40, fontWeight: 500, lineHeight: 1 }}>{money(combinedMonthly)}</div>
        <div style={{ fontSize: 12.5, color: C.soft, marginTop: 8 }}>
          {money(combinedTotal)} placés · {pct(combinedBlended)} de rendement pondéré
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }} className="stack-mobile">
        <Card>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 14 }}>Répartition par compte</div>
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <Donut slices={accountSlices} centerValue={money(combinedTotal, 0)} centerLabel="total" />
            <DonutLegend slices={accountSlices} />
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 14 }}>Répartition géographique</div>
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <Donut slices={regionSlices} centerValue={`${regionSlices.length}`} centerLabel="régions" />
            <DonutLegend slices={regionSlices} />
          </div>
        </Card>
      </div>

      <Card style={{ marginBottom: 14 }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 14, gap: 10, flexWrap: "wrap",
        }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>Évolution du revenu mensuel combiné</div>
          <Segmented size="sm" value={histPeriod} onChange={setHistPeriod} options={HISTORY_PERIODS} />
        </div>
        <Sparkline points={historyCombined} color={C.ink} />
      </Card>

      <div style={{ fontSize: 12, color: C.faint, textAlign: "center", padding: "6px 4px" }}>
        Vue en lecture seule. Sélectionne CELI ou REER ci-dessus pour ajuster les positions.
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  Vue d'un compte (CELI ou REER)                                     */
/* ══════════════════════════════════════════════════════════════════ */
function AccountView({ accountId, portfolio: p, accent, pushToast }) {
  const cfg = ACCOUNTS[accountId];
  const [tab, setTab] = useState("apercu");
  const [histPeriod, setHistPeriod] = useState("mois");
  const [paste, setPaste] = useState("");
  const [imgPreview, setImgPreview] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    const onPaste = (e) => {
      const it = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
      if (it) { e.preventDefault(); readImage(it.getAsFile()); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  const total = p.totals.total, monthly = p.totals.monthly, blended = p.totals.blended;
  const plan = useMemo(() => allocate(p.lines, p.deposit, p.minLot), [p.lines, p.deposit, p.minLot]);

  const mix = useMemo(() => {
    const t = total || 1;
    const s = (f) => (p.lines.filter(f).reduce((a, l) => a + valueOf(l), 0) / t) * 100;
    return { ca: s((l) => l.region === "CA"), cc: s((l) => l.cc) };
  }, [p.lines, total]);

  const regionSlices = useMemo(() => {
    const byRegion = {};
    p.lines.forEach((l) => { byRegion[l.region] = (byRegion[l.region] || 0) + valueOf(l); });
    const labels = { CA: "Canada", INT: "International", MOND: "Mondial" };
    return Object.entries(byRegion).map(([k, v]) => ({ label: labels[k] || k, value: v }));
  }, [p.lines]);

  const ordered = useMemo(
    () =>
      p.lines
        .map((l) => ({ ...l, value: valueOf(l), actual: total > 0 ? (valueOf(l) / total) * 100 : 0 }))
        .sort((a, b) => a.actual - a.target - (b.actual - b.target)),
    [p.lines, total]
  );

  const historyPoints = useMemo(
    () => filterHistory(p.history, histPeriod).map((h) => ({ v: h.monthly })),
    [p.history, histPeriod]
  );

  const applyPaste = () => {
    const f = parsePaste(paste);
    if (!f.length) { pushToast("Aucune ligne reconnue dans ce texte.", "error"); return; }
    pushToast(p.applyRows(f));
    setPaste("");
  };

  const readImage = async (file) => {
    if (!file?.type?.startsWith("image/")) return;
    setBusy("img"); setImgPreview(URL.createObjectURL(file));
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
      pushToast(rows.length ? p.applyRows(rows) : "Aucun titre lisible sur cette capture.", rows.length ? "ok" : "error");
    } catch {
      pushToast("Lecture impossible. Vérifie que la capture montre l'écran « Titres détenus ».", "error");
    }
    setBusy(null);
  };

  const refreshQuotes = async () => {
    setBusy("quotes");
    try {
      const syms = p.lines.map((l) => (l.ticker.includes(".") ? l.ticker : l.ticker + ".TO"));
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
      p.setLines((ls) => ls.map((l) => {
        const k = l.ticker.replace(/\..*$/, "").toUpperCase();
        const q = quotes[k] ?? quotes[l.ticker];
        if (typeof q === "number" && q > 0) { hits++; return { ...l, price: q }; }
        return l;
      }));
      p.touch();
      pushToast(hits ? `${hits} cours mis à jour.` : "Aucun cours trouvé. Réessaie dans un moment.", hits ? "ok" : "error");
    } catch {
      pushToast("Les cours n'ont pas pu être récupérés. Réessaie dans un moment.", "error");
    }
    setBusy(null);
  };

  const S = {
    card: { background: C.surface, border: `1px solid ${C.rule}`, borderRadius: 14, padding: 20, boxShadow: C.shadow },
    label: { fontSize: 11.5, color: C.faint },
    num: { fontFamily: MONO, fontVariantNumeric: "tabular-nums" },
    input: {
      fontFamily: MONO, border: `1px solid ${C.rule}`, borderRadius: 8,
      padding: "7px 9px", background: C.surface, color: C.ink, width: "100%", fontSize: 13,
    },
    tab: (on) => ({
      padding: "10px 2px", marginRight: 22, border: "none", background: "transparent",
      borderBottom: `2px solid ${on ? accent.accent : "transparent"}`,
      color: on ? C.ink : C.faint, fontFamily: SANS, fontSize: 13.5,
      fontWeight: on ? 600 : 450, cursor: "pointer",
    }),
    btn: (primary) => ({
      background: primary ? C.ink : "transparent",
      color: primary ? C.bg : C.ink,
      border: primary ? "none" : `1px solid ${C.ruleStrong}`,
      borderRadius: 8, padding: "9px 16px", fontFamily: SANS, fontSize: 13.5,
      cursor: "pointer", whiteSpace: "nowrap", fontWeight: 500,
    }),
  };

  const when = p.stamp
    ? new Date(p.stamp).toLocaleString("fr-CA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "jamais";

  const taxSavings = accountId === "reer" ? estimateTaxSavings(p.deposit, p.extra?.marginalRate) : 0;

  return (
    <>
      {/* ── En-tête du compte ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: accent.accent }} />
            <span style={{ fontSize: 12, color: C.faint }}>{cfg.fullName} · revenu mensuel estimé</span>
          </div>
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
      <div style={{ display: "flex", borderBottom: `1px solid ${C.rule}`, margin: "24px 0 22px", overflowX: "auto" }}>
        {[
          ["apercu", "Aperçu"],
          ["depot", "Prochain dépôt"],
          ["lignes", "Mes lignes"],
          ["donnees", "Mettre à jour"],
        ].map(([k, t]) => (
          <button key={k} onClick={() => setTab(k)} style={S.tab(tab === k)}>{t}</button>
        ))}
      </div>

      {/* ══ Aperçu ══ */}
      {tab === "apercu" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }} className="stack-mobile">
            <Card>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 14 }}>Répartition géographique</div>
              {total > 0 ? (
                <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                  <Donut slices={regionSlices} centerValue={pct(mix.ca)} centerLabel="Canada" />
                  <DonutLegend slices={regionSlices} />
                </div>
              ) : <EmptyNote />}
            </Card>
            <Card>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Stat label="Canada" value={pct(mix.ca)} tone={mix.ca > 58 ? C.over : C.ink} />
                <Stat label="Covered call" value={pct(mix.cc)} tone={mix.cc > 32 ? C.over : C.ink} />
                <Stat label="Lignes" value={String(p.lines.length)} />
                <Stat label="Rendement pondéré" value={pct(blended)} />
              </div>
              {accountId === "reer" && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.rule}` }}>
                  <ReerFields p={p} taxSavings={taxSavings} />
                </div>
              )}
            </Card>
          </div>

          <Card>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 14, gap: 10, flexWrap: "wrap",
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Évolution du revenu mensuel</div>
              <Segmented size="sm" value={histPeriod} onChange={setHistPeriod} options={HISTORY_PERIODS} />
            </div>
            <Sparkline points={historyPoints.length >= 2 ? historyPoints : null} color={accent.accent} />
          </Card>
        </>
      )}

      {/* ══ Dépôt ══ */}
      {tab === "depot" && (
        <>
          <Card style={{ marginBottom: 14 }}>
            <div style={S.label}>Combien tu déposes</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <input type="number" value={p.deposit} onFocus={selectOnFocus}
                onChange={(e) => p.setDeposit(parseFloat(e.target.value) || 0)}
                style={{ ...S.input, fontSize: 32, fontWeight: 500, padding: "5px 10px", width: 172 }} />
              <span style={{ fontSize: 25, color: C.faint }}>$</span>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={S.label}>minimum par ligne</div>
                <input type="number" value={p.minLot} onFocus={selectOnFocus}
                  onChange={(e) => p.setMinLot(parseFloat(e.target.value) || 0)}
                  style={{ ...S.input, width: 74, padding: "4px 7px", marginTop: 3, textAlign: "right" }} />
              </div>
            </div>
            {accountId === "reer" && p.deposit > 0 && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.rule}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12.5, color: C.soft }}>Économie d'impôt estimée (taux marginal {p.extra?.marginalRate ?? 37} %)</span>
                <span style={{ ...S.num, fontSize: 14, color: accent.accent, fontWeight: 600 }}>{money(taxSavings)}</span>
              </div>
            )}
          </Card>

          <Card>
            <div style={{ ...S.label, marginBottom: 4 }}>Où mettre l'argent</div>
            <div style={{ fontSize: 12.5, color: C.soft, marginBottom: 16 }}>
              Les lignes les plus loin de leur cible d'abord. Les parts sous {money(p.minLot, 0)} sont
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
                <div style={{ ...S.num, fontSize: 21, color: accent.accent }}>{money(plan[l.ticker])}</div>
              </div>
            ))}
            <div style={{
              display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 13,
              borderTop: `1px solid ${C.rule}`, fontSize: 12.5, color: C.soft,
            }}>
              <span>Total réparti</span>
              <span style={S.num}>{money(Object.values(plan).reduce((s, v) => s + v, 0))}</span>
            </div>
          </Card>
        </>
      )}

      {/* ══ Lignes ══ */}
      {tab === "lignes" && (
        <>
          <Card style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            <Stat label="Canada" value={pct(mix.ca)} tone={mix.ca > 58 ? C.over : C.ink} />
            <Stat label="Covered call" value={pct(mix.cc)} tone={mix.cc > 32 ? C.over : C.ink} />
            <Stat label="Lignes" value={String(p.lines.length)} />
          </Card>

          <Card>
            <div style={{ fontSize: 12.5, color: C.soft, marginBottom: 18 }}>
              Le trait vertical marque la cible. Vert sous la cible, rouge au-dessus.
            </div>
            {p.lines.length === 0 && <EmptyNote text="Aucune position. Va dans « Mettre à jour » pour importer tes titres." />}
            {ordered.map((l, i) => {
              const d = l.actual - l.target; // écart en points, utilisé seulement pour la couleur
              const dollarGap = l.value - (l.target / 100) * total; // même écart, en dollars
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
                      {dollarGap > 0 ? "+" : ""}{money(dollarGap)} vs cible
                    </span>
                  </div>
                </div>
              );
            })}
          </Card>
        </>
      )}

      {/* ══ Données ══ */}
      {tab === "donnees" && (
        <>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Importer une capture</div>
            <div style={{ fontSize: 12.5, color: C.soft, margin: "5px 0 14px" }}>
              Capture l'écran « Titres détenus ». Les parts et les valeurs sont lues automatiquement.
            </div>
            <label
              className={busy === "img" ? "busy" : ""}
              style={{
                display: "block", border: `1.5px dashed ${C.ruleStrong}`, borderRadius: 10,
                padding: "26px 16px", textAlign: "center",
                cursor: busy ? "wait" : "pointer", background: C.bg,
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

            {imgPreview && (
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 14 }}>
                <img src={imgPreview} alt="Capture importée" style={{
                  width: 46, height: 46, objectFit: "cover", objectPosition: "top",
                  border: `1px solid ${C.rule}`, borderRadius: 8,
                }} />
                <span style={{ fontSize: 12.5, color: C.soft }}>Traitée — voir la notification.</span>
              </div>
            )}
          </Card>

          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Coller le texte</div>
            <div style={{ fontSize: 12.5, color: C.soft, margin: "5px 0 12px" }}>
              Solution de rechange si la capture ne passe pas.
            </div>
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={5}
              placeholder={"ENB.TO\n2,083 actions\n144,83 CAD"}
              style={{ ...S.input, resize: "vertical", lineHeight: 1.5 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 11 }}>
              <button onClick={applyPaste} style={S.btn(true)}>Lire le collage</button>
            </div>
          </Card>

          <Card>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Ajuster à la main</div>
            <div className="manual-header" style={{
              display: "grid", gridTemplateColumns: "1fr 78px 74px 56px 56px",
              gap: 7, ...S.label, marginBottom: 6,
            }}>
              <span /><span>parts</span><span>prix</span><span>cible</span><span>rend.</span>
            </div>
            {p.lines.map((l) => (
              <div key={l.ticker} className="manual-row" style={{
                display: "grid", gridTemplateColumns: "1fr 78px 74px 56px 56px", gap: 7,
                alignItems: "center", padding: "8px 0", borderTop: `1px solid ${C.rule}`,
              }}>
                <span className="manual-ticker" style={{ fontSize: 13.5, fontWeight: 500 }}>{l.ticker}</span>
                <label className="manual-field">
                  <span className="manual-field-label">parts</span>
                  <input type="number" step="0.0001" value={l.shares} aria-label={`Parts ${l.ticker}`} onFocus={selectOnFocus}
                    onChange={(e) => p.setLine(l.ticker, { shares: parseFloat(e.target.value) || 0 })}
                    style={{ ...S.input, fontSize: 12, padding: "5px 6px" }} />
                </label>
                <label className="manual-field">
                  <span className="manual-field-label">prix</span>
                  <input type="number" step="0.01" value={l.price} aria-label={`Prix ${l.ticker}`} onFocus={selectOnFocus}
                    onChange={(e) => p.setLine(l.ticker, { price: parseFloat(e.target.value) || 0 })}
                    style={{ ...S.input, fontSize: 12, padding: "5px 6px" }} />
                </label>
                <label className="manual-field">
                  <span className="manual-field-label">cible</span>
                  <input type="number" value={l.target} aria-label={`Cible ${l.ticker}`} onFocus={selectOnFocus}
                    onChange={(e) => p.setLine(l.ticker, { target: parseFloat(e.target.value) || 0 })}
                    style={{ ...S.input, fontSize: 12, padding: "5px 6px" }} />
                </label>
                <label className="manual-field">
                  <span className="manual-field-label">rend.</span>
                  <input type="number" step="0.1" value={l.yield} aria-label={`Rendement ${l.ticker}`} onFocus={selectOnFocus}
                    onChange={(e) => p.setLine(l.ticker, { yield: parseFloat(e.target.value) || 0 })}
                    style={{ ...S.input, fontSize: 12, padding: "5px 6px" }} />
                </label>
              </div>
            ))}
            {p.lines.length === 0 && <EmptyNote text="Importe une capture ou colle du texte ci-dessus pour commencer." />}
          </Card>
        </>
      )}
    </>
  );
}

function ReerFields({ p, taxSavings }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: C.faint, marginBottom: 10 }}>Propre au REER</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          <div style={{ fontSize: 11, color: C.faint, marginBottom: 4 }}>Droits de cotisation restants</div>
          <input type="number" value={p.extra?.contribRoom ?? 0} onFocus={selectOnFocus}
            onChange={(e) => p.setExtra({ contribRoom: parseFloat(e.target.value) || 0 })}
            style={{
              fontFamily: MONO, border: `1px solid ${C.rule}`, borderRadius: 8,
              padding: "7px 9px", background: C.surface, color: C.ink, width: "100%", fontSize: 13,
            }} />
        </label>
        <label>
          <div style={{ fontSize: 11, color: C.faint, marginBottom: 4 }}>Taux marginal (%)</div>
          <input type="number" value={p.extra?.marginalRate ?? 37} onFocus={selectOnFocus}
            onChange={(e) => p.setExtra({ marginalRate: parseFloat(e.target.value) || 0 })}
            style={{
              fontFamily: MONO, border: `1px solid ${C.rule}`, borderRadius: 8,
              padding: "7px 9px", background: C.surface, color: C.ink, width: "100%", fontSize: 13,
            }} />
        </label>
      </div>
      <div style={{ fontSize: 11, color: C.faint, marginTop: 8 }}>
        Saisis ces valeurs depuis ton avis de cotisation — aucune API publique de l'ARC ne les fournit.
      </div>
    </div>
  );
}

function EmptyNote({ text = "Aucune donnée pour l'instant." }) {
  return <div style={{ color: C.faint, fontSize: 13, padding: "10px 0" }}>{text}</div>;
}
