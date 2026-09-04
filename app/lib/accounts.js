/* ══════════════════════════════════════════════════════════════════ */
/*  Définition des comptes gérés par l'app                             */
/* ══════════════════════════════════════════════════════════════════ */

/* Portefeuille cible du CELI (repris tel quel de la version précédente). */
const DEFAULT_LINES_CELI = [
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

/* Le REER démarre vide : on ne devine pas des positions que l'utilisateur */
/* n'a pas encore saisies — il les importe par capture ou collage.         */
const DEFAULT_LINES_REER = [];

export const ACCOUNTS = {
  celi: {
    id: "celi",
    label: "CELI",
    fullName: "Compte d'épargne libre d'impôt",
    storageKey: "portfolio-celi-v1",
    legacyStorageKeys: ["celi-tracker-v2"], // migration depuis l'ancienne version mono-compte
    defaultLines: DEFAULT_LINES_CELI,
    extraFields: null,
  },
  reer: {
    id: "reer",
    label: "REER",
    fullName: "Régime enregistré d'épargne-retraite",
    storageKey: "portfolio-reer-v1",
    legacyStorageKeys: [],
    defaultLines: DEFAULT_LINES_REER,
    // Champs propres au REER, sans équivalent au CELI.
    extraFields: { contribRoom: 0, marginalRate: 37 },
  },
};

export const ACCOUNT_ORDER = ["celi", "reer"];
