# Portefeuille — CELI & REER

Suivi de portefeuille et répartition des dépôts, pour le CELI et le REER séparément, avec une vue combinée.

## Fonctionnalités

- Deux comptes indépendants (CELI, REER), chacun avec ses propres positions, cible de dépôt et historique — stockés séparément dans le navigateur.
- Vue « Ensemble » en lecture seule qui agrège les deux comptes (revenu mensuel combiné, répartition par compte et par région).
- Répartition automatique d'un nouveau dépôt selon l'écart aux cibles.
- Import des positions par capture d'écran (lue par Claude) ou par collage de texte Wealthsimple.
- Champs propres au REER : droits de cotisation restants et estimation de l'économie d'impôt d'un dépôt (taux marginal saisi manuellement — aucune API publique de l'ARC ne le fournit).
- Historique du revenu mensuel estimé, affiché en courbe.

## Variables d'environnement

`ANTHROPIC_API_KEY` — nécessaire pour la lecture des captures d'écran
et la récupération des cours. À ajouter dans Vercel :
Settings → Environment Variables.

`ALLOWED_ORIGIN` (optionnelle mais recommandée) — restreint `/api/claude`
aux requêtes provenant de ce domaine (ex. `https://ton-app.vercel.app`).
Sans elle, la route accepte les requêtes de n'importe quelle origine, ce
qui permet à quiconque trouve l'URL de consommer ta clé Anthropic. Pour
une protection plus forte, ajoute un écran de mot de passe ou une vraie
authentification devant l'app.

## Développement local

```
npm install
npm run dev
```

## Migration depuis l'ancienne version (un seul compte)

Les données de l'ancienne clé `celi-tracker-v2` sont reprises
automatiquement dans le compte CELI au premier chargement — rien à faire
manuellement.
