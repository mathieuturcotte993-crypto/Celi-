export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Relais vers l'API Anthropic.
 * La clé reste sur le serveur : elle n'est jamais envoyée au navigateur.
 *
 * Protection légère : n'accepte que les requêtes dont l'en-tête Origin
 * correspond au domaine de déploiement, et limite le débit par IP en
 * mémoire. Ce n'est pas une authentification complète (un attaquant qui
 * usurpe l'en-tête Origin passe outre), mais ça bloque l'usage accidentel
 * ou automatisé depuis d'autres sites. Pour une vraie protection, ajoute
 * un mot de passe d'accès (variable APP_ACCESS_KEY + écran de saisie) ou
 * une authentification complète.
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const hits = new Map(); // ip -> [timestamps]

function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > MAX_PER_WINDOW;
}

function originAllowed(req) {
  const allowed = process.env.ALLOWED_ORIGIN; // ex. https://portefeuille-celi.vercel.app
  if (!allowed) return true; // pas configuré : ne bloque pas (déploiement initial / dev local)
  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  return origin.startsWith(allowed);
}

export async function POST(req) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return Response.json(
      { error: "Clé API absente. Ajoute ANTHROPIC_API_KEY dans les variables d'environnement Vercel." },
      { status: 500 }
    );
  }

  if (!originAllowed(req)) {
    return Response.json({ error: "Origine non autorisée." }, { status: 403 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return Response.json({ error: "Trop de requêtes. Réessaie dans une minute." }, { status: 429 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requête illisible." }, { status: 400 });
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    return Response.json(data, { status: r.status });
  } catch {
    return Response.json({ error: "L'API Anthropic n'a pas répondu." }, { status: 502 });
  }
}
