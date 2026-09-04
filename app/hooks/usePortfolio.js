"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ACCOUNTS } from "../lib/accounts";
import { computeTotals } from "../lib/portfolio";

const HISTORY_MAX = 90;

/* Stockage local du navigateur. */
const store = {
  get(k) {
    if (typeof window === "undefined") return null;
    const v = window.localStorage.getItem(k);
    return v === null ? null : v;
  },
  set(k, v) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(k, v);
  },
};

function loadAccount(accountId) {
  const cfg = ACCOUNTS[accountId];
  let raw = store.get(cfg.storageKey);
  if (!raw) {
    for (const legacy of cfg.legacyStorageKeys || []) {
      raw = store.get(legacy);
      if (raw) break;
    }
  }
  const base = {
    lines: cfg.defaultLines,
    deposit: 280,
    minLot: 50,
    stamp: null,
    extra: cfg.extraFields ? { ...cfg.extraFields } : null,
    history: [],
  };
  if (!raw) return base;
  try {
    const d = JSON.parse(raw);
    return {
      lines: d.lines?.length ? d.lines : base.lines,
      deposit: typeof d.deposit === "number" ? d.deposit : base.deposit,
      minLot: typeof d.minLot === "number" ? d.minLot : base.minLot,
      stamp: d.stamp || null,
      extra: cfg.extraFields ? { ...cfg.extraFields, ...(d.extra || {}) } : null,
      history: Array.isArray(d.history) ? d.history : [],
    };
  } catch {
    return base;
  }
}

/**
 * Gère l'état complet (lignes, dépôt, historique) d'UN compte (CELI ou REER),
 * avec persistance locale isolée par compte.
 */
export function usePortfolio(accountId) {
  const cfg = ACCOUNTS[accountId];
  const [state, setState] = useState(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setState(loadAccount(accountId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  useEffect(() => {
    if (!state) return;
    store.set(cfg.storageKey, JSON.stringify(state));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const totals = useMemo(() => (state ? computeTotals(state.lines) : { total: 0, monthly: 0, blended: 0 }), [state]);

  const setLines = (updater) =>
    setState((s) => ({ ...s, lines: typeof updater === "function" ? updater(s.lines) : updater }));

  const setLine = (ticker, patch) =>
    setLines((ls) => ls.map((l) => (l.ticker === ticker ? { ...l, ...patch } : l)));

  const setDeposit = (deposit) => setState((s) => ({ ...s, deposit }));
  const setMinLot = (minLot) => setState((s) => ({ ...s, minLot }));
  const setExtra = (patch) => setState((s) => ({ ...s, extra: { ...s.extra, ...patch } }));

  /** Marque un rafraîchissement des données et ajoute un point d'historique. */
  const touch = () => {
    setState((s) => {
      const t = computeTotals(s.lines);
      const point = { t: Date.now(), monthly: t.monthly, total: t.total };
      const history = [...(s.history || []), point].slice(-HISTORY_MAX);
      return { ...s, stamp: point.t, history };
    });
  };

  const applyRows = (found) => {
    const base = (t) => String(t).replace(/\..*$/, "").toUpperCase();
    let m = 0, a = 0;
    const next = [...(stateRef.current?.lines || [])];
    found.forEach((f) => {
      const i = next.findIndex((l) => base(l.ticker) === base(f.ticker));
      if (i >= 0) { next[i] = { ...next[i], ...f, ticker: next[i].ticker }; m++; }
      else { next.push({ role: "Ajoutée automatiquement", target: 0, yield: 0, region: "CA", cc: false, ...f }); a++; }
    });
    setLines(next);
    touch();
    return `${m} ligne${m > 1 ? "s" : ""} à jour${a ? `, ${a} ajoutée${a > 1 ? "s" : ""}` : ""}.`;
  };

  return {
    ready: !!state,
    config: cfg,
    lines: state?.lines || [],
    deposit: state?.deposit ?? 280,
    minLot: state?.minLot ?? 50,
    stamp: state?.stamp ?? null,
    extra: state?.extra ?? null,
    history: state?.history ?? [],
    totals,
    setLine,
    setLines,
    setDeposit,
    setMinLot,
    setExtra,
    touch,
    applyRows,
  };
}
