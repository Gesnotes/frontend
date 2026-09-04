# Gesnotes — frontend

PWA de suivi scolaire (React 19, Vite, TypeScript). L'API correspondante vit
dans le dépôt voisin `../backend` — deux dépôts Git indépendants, pas un
monorepo.

## Architecture en un coup d'œil

- **Trois espaces** derrière `RequireRole` : admin (`AppShell`, desktop),
  enseignant et parent (`TeacherShell`/`ParentShell`, mobile-first). Chaque
  espace a son propre dossier sous `src/pages/`.
- **TanStack Query** partout, avec `QueryBoundary` pour les états de
  chargement/erreur — ne pas gérer `isLoading`/`isError` à la main dans une
  page si `QueryBoundary` peut le faire.
- **Saisie hors connexion** : `src/lib/offlineQueue.ts` garde les lots de
  notes sur l'appareil (IndexedDB) et les rejoue au retour du réseau, sans
  doublon côté serveur. Tout nouvel écran de saisie côté enseignant (présence
  comprise) doit réutiliser ce mécanisme plutôt qu'en écrire un autre.
- **Sous-domaine d'école** : `X-School-Subdomain`, résolu côté backend par
  `schoolContext`. Le terme choisi et l'école résolue sont mémorisés en
  `localStorage` (voir `src/context/TermProvider.tsx`, `src/api/config.ts`).

## Design system — `DESIGN.md`

`src/styles/tokens.css` référence `DESIGN.md` (racine du dépôt) comme source
unique de vérité pour couleurs, rayons, espacements, typographie et
composants. **Le lire avant tout travail d'interface** — ne jamais coder une
couleur ou un espacement en dur. Il documente aussi les principes UX établis
pour ce projet (un public de secrétariats scolaires, pas d'informaticiens) et
les motifs d'interaction (groupe à trois états, carte de choix, étapes,
liste de tâches d'accueil) à réutiliser pour toute nouvelle fonctionnalité
plutôt que d'en inventer de nouveaux.

- **Tailwind uniquement pour tout nouveau design** (classes utilitaires
  directement dans le JSX) — plus de nouvelle classe CSS (`.ui-*`, `page-*`…)
  ni de `style={{ ... }}` avec des `var(--...)`. Les jetons de couleur restent
  ceux de `DESIGN.md`, mais via les classes DaisyUI du thème « gesnotes »
  déclaré dans `src/styles/tailwind.css` (`bg-primary`, `text-primary`,
  `bg-primary/10`…) plutôt qu'en `var(--...)` inline. L'ancien système de
  jetons CSS (`tokens.css`/`base.css`) reste tel quel sur les écrans qui
  l'utilisent déjà (pas de réécriture rétroactive demandée) — cette règle ne
  s'applique qu'au code neuf.

## Conventions

- **Français partout**, y compris les commentaires. Les textes visibles par
  l'utilisateur doivent être compréhensibles par un public non technique et
  âgé — pas de jargon (« session », « payload », « synchronisation »…), une
  aide permanente sous un champ est un signal que l'écran doit être repensé
  plutôt qu'un renfort à ajouter (principe 7 de `DESIGN.md`).
- **Boutons** : variantes `primary | secondary | tonal | danger |
  danger-solid | ghost` (`src/ui/Button.tsx`) — une seule action `primary`
  par écran.
- **Tons** : `neutral | info | success | warning | danger`
  (`src/ui/tone.ts`), mappés sur la palette Material 3 du design system — ne
  jamais introduire une couleur hors de ces cinq tons pour un indicateur.
- **Suppression définitive** : `PermanentDeleteDialog` avec `confirmName`
  quand l'action est irréversible (déjà en place pour élèves et périodes) —
  motif de référence pour toute nouvelle suppression définitive.

## Git et livraison

- Une fonctionnalité = une branche dédiée créée depuis `origin/dev`, des
  commits au fil de l'eau, une PR ouverte contre `dev` (jamais `main`
  directement). Ne jamais laisser du travail non commité s'accumuler entre
  deux fonctionnalités.
- `main` et `dev` peuvent diverger — toujours `git fetch` puis vérifier l'état
  réel via `origin/*` et `gh pr list` avant d'affirmer qu'un travail est ou
  n'est pas livré.
- Pas de `Co-Authored-By` ni de mention d'outil IA dans les commits ou les PR.

## Coordination et délégation

Ce fichier, pas un outil externe, est la référence : la coordination se fait
avec l'outil **Agent** de Claude Code, pas avec un système de délégation
tiers.

- **Déléguer à un sous-agent** (`Agent`, `subagent_type: Explore`) pour une
  recherche qui dépasse 2-3 `Grep`/`Read` ciblés, ou qui couvre plusieurs
  pages sans certitude sur l'emplacement. Pour un choix d'architecture UI à
  trancher avant de coder, `subagent_type: Plan`.
- Le résultat d'un sous-agent est un brouillon, pas une vérité acquise : avant
  de le considérer comme fait, relire le diff produit et vérifier le rendu
  réel (build, ou navigateur) — jamais faire confiance à un résumé d'agent
  sans vérifier le code réellement produit.
- Ne jamais faire transiter de secret (`.env.local`, jetons) dans un prompt
  de sous-agent.
- Une seule anomalie observée une fois n'est pas une règle : ne l'ajouter à ce
  fichier (ou en mémoire) que si elle se répète ou que sa gravité le
  justifie.

## Repères utiles

- `src/pages/admin/ClassBulletinPanel.tsx` — motif de panneau réutilisable
  (dashboard, liste de classes, fiche de classe l'utilisent tous les trois).
- `src/pages/admin/ImportStudentsModal.tsx` — motif d'import en deux temps
  (aperçu à blanc puis confirmation), à reprendre pour toute nouvelle
  importation ou action groupée destructive.
- `src/api/ApiError.ts` — messages d'erreur par défaut ; toute nouvelle
  erreur réseau doit y passer plutôt que d'inventer un texte dans la page.
