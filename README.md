# frontend

Interface web de Gesnotes pour les administrateurs d'école, les enseignants
et les parents : gestion des classes, matières et comptes, saisie des notes
avec calcul automatique des moyennes, suivi de présence, bulletins et
notifications.

L'API correspondante vit dans le dépôt voisin `../backend` — deux dépôts Git
indépendants, pas un monorepo.

**Rôles gérés :** Admin école, Enseignant, Parent

## Stack

- React 19 + TypeScript + Vite
- TanStack Query (état serveur, cache, `QueryBoundary`)
- Tailwind CSS + DaisyUI (thème « gesnotes » — voir `DESIGN.md`)
- PWA installable et utilisable hors connexion, avec file d'attente des
  saisies de notes rejouée au retour du réseau (`vite-plugin-pwa`,
  `src/lib/offlineQueue.ts`)
- Notifications push (Firebase Cloud Messaging côté client)
- Suivi d'erreurs Sentry/GlitchTip
- Prérendu SEO au build (Playwright/Chromium) pour la landing, la connexion
  et l'inscription

## Prérequis

- Node.js 24
- Le backend (`../backend`) démarré en local, ou une API accessible

## Démarrage en local

```bash
npm install
cp .env.example .env.local   # aucune valeur à remplir en dev
npm run dev                  # http://localhost:5173
```

Marche à suivre complète (comptes de démonstration, connexion sans
sous-domaine, essai sur téléphone via tunnel HTTPS) : `docs/DEV-LOCAL.md`.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement Vite |
| `npm run build` | build de production (`tsc -b && vite build`) |
| `npm run lint` | ESLint |
| `npm run preview` | sert le build de production en local |

`npm run build` installe d'abord Chromium (`prebuild`, binaire seul — sans
droits root, pour rester compatible avec des environnements de build
restreints comme Render) puis, une fois le build terminé, prérend trois
pages publiques après exécution réelle du JS et écrase le HTML statique
correspondant dans `dist/` (`postbuild`, `scripts/prerender.mjs`) : les
robots qui n'exécutent pas de JavaScript voient alors un contenu réel plutôt
qu'une coquille vide.

## Variables d'environnement

Voir `.env.example` pour la liste complète, commentée. Tout est facultatif
en développement : le proxy de Vite relaie `/api` vers le backend (pas de
CORS à configurer), et sans les clés Firebase seules les notifications sont
inactives (l'écran « Alertes » de l'espace parent l'explique). Détails des
notifications push : `docs/PWA-PUSH.md`.

## Design system

`DESIGN.md` (racine du dépôt) est la référence unique pour couleurs, rayons,
espacements, typographie et composants — à lire avant tout travail
d'interface. Tailwind et classes utilitaires directement dans le JSX pour
tout nouveau design (plus de nouvelle classe CSS ni de `style` inline avec
des `var(--...)`).

## Architecture

Vue d'ensemble (trois espaces par rôle derrière `RequireRole`, TanStack Query
partout, file d'attente hors ligne, résolution d'école par JWT) :
voir `CLAUDE.md`.

## Déploiement

Image Docker buildée sur `mcr.microsoft.com/playwright` (Chromium déjà
fourni, épinglé à la version exacte de `playwright` dans `package.json` —
voir les commentaires du `Dockerfile`), servie par nginx, déployée par
`docker compose up -d --build frontend` sur push vers `main`
(`.github/workflows/deploy.yml`, déploiement par SSH vers le serveur).

## Git et livraison

Une fonctionnalité = une branche dédiée créée depuis `origin/dev`, PR ouverte
contre `dev` (jamais `main` directement).
