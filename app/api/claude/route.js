export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Relais vers l'API Anthropic.
 * La clé reste sur le serveur : elle n'est jamais envoyée au navigateur.
 */
export async function POST(req) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return Response.json(
      { error: "Clé API absente. Ajoute ANTHROPIC_API_KEY dans les variables d'environnement Vercel." },
      { status: 500 }
    );
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
