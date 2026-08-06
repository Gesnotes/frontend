# Gesnotes — Design system « Academic Clarity »

Source unique de vérité pour les couleurs, rayons, espacements, typographie et
motifs d'interaction. `src/styles/tokens.css` implémente la section 1 ; ne pas
coder de couleur, rayon ou espacement en dur ailleurs — passer par un jeton.

Ce document couvre deux choses distinctes, marquées explicitement :

- **Existant** — déjà implémenté dans `src/styles/` et `src/ui/`.
- **Nouveau** — motifs conçus pour le mode par classe (présence), l'année
  scolaire, la réinscription, l'inscription des écoles et la connexion sans
  sous-domaine. Pas encore codés ; à suivre à l'implémentation.

## 1. Palette — *existant*

Nommage Material Design 3 (rôle plutôt que teinte littérale : `--primary`,
pas `--bleu`). Chaque paire `--x` / `--on-x` garantit un contraste lisible ;
toujours poser le texte avec le `--on-x` de la surface sur laquelle il vit.

| Rôle | Jeton | Valeur | Usage |
|---|---|---|---|
| Fond de page | `--background` / `--surface` | `#f8f9ff` | Fond général |
| Carte | `--surface-container-lowest` | `#ffffff` | Cartes, panneaux |
| Carte surélevée | `--surface-container` … `--surface-container-highest` | `#e5eeff` → `#d3e4fe` | Zones imbriquées, barres actives |
| Texte principal | `--on-surface` | `#0b1c30` | Corps de texte |
| Texte secondaire | `--outline` | `#5b5c6b` | Méta, libellés inactifs — ≥ 6:1 sur blanc, tenu par l'audit d'accessibilité |
| Primaire | `--primary` / `--on-primary` | `#00288e` / blanc | Actions principales |
| Primaire (fond teinté) | `--primary-container` / `--on-primary-container` | `#1e40af` / `#a8b8ff` | Fond doux d'action primaire, badges « info » |
| Secondaire (succès) | `--secondary` | `#006c49` | Validations, notes ≥ 85 % (`gradeTone`) |
| Tertiaire (attention) | `--tertiary-container` | `#872d00` | Avertissement doux — **pas d'ambre** : c'est la couleur « retard » du mode présence |
| Erreur | `--error` | `#ba1a1a` | Blocages, notes < 50 %, statut « absent » |

**Correspondance des tons** (`src/ui/tone.ts`, `ChipTone`) : `neutral → outline`,
`info → primary-container`, `success → secondary`, `warning → tertiary-container`,
`danger → error`. Tout nouvel indicateur coloré (présence, réinscription) doit
réutiliser cette palette de cinq tons plutôt qu'inventer une couleur.

## 2. Rayons, espacements, élévation — *existant*

- Rayons : `--radius-sm` 4px → `--radius-xl` 24px, `--radius-full` pour les pastilles.
- Espacements : rythme 4px / 8px, `--space-1` (4px) à `--space-10` (40px).
- Élévation : `--elevation-1` (cartes), `--elevation-2` (modales, menus flottants).
- Mouvement : `--motion-fast` 150ms, `--motion-base` 250ms, `--motion-slow` 400ms — respecter `prefers-reduced-motion`.

## 3. Typographie — *existant*

`--font-sans: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`.
Échelle : `display-lg` (48px, titres de connexion), `headline-lg` (32px→24px
sous 1024px), `title-md` (20px, titres de page), `body-lg` (16px, corps),
`body-md` (14px, secondaire), `label-sm` (12px, majuscules, `letter-spacing`
0.05em pour les étiquettes de champ et de statut).

## 4. Composants — *existant*

- **Bouton** (`src/ui/Button.tsx`) — variantes `primary | secondary | tonal |
  danger | danger-solid | ghost`, tailles `sm | md | lg`, `block` pour pleine
  largeur. Une seule action `primary` par écran (principe 1, §6).
- **Chip** — tons `neutral | info | success | warning | danger` (§1).
- **Alert** (`src/ui/States.tsx`) — tons `info | danger` uniquement ; pas de
  ton « succès » pour une bannière permanente, réservé au Toast.
- **Toast** — tons `success | error | info`, transitoire.
- **Modal / ConfirmDialog** — `danger` bascule le bouton de confirmation en
  `danger-solid` et rouge ; **`PermanentDeleteDialog`** ajoute un champ
  `confirmName` quand l'action est irréversible (déjà en place pour élèves et
  périodes) — le motif de référence pour toute nouvelle suppression définitive
  (années scolaires y compris).

## 5. Principes d'UX — *existant + nouveau*

Écrits pour des secrétariats et directions d'école peu à l'aise avec
l'informatique. Chaque principe réduit le nombre de décisions et de mots à
lire — pas le nombre d'écrans.

1. **Une action principale par écran.** Le bouton qui fait avancer est
   toujours seul, toujours au même endroit.
2. **Aucun mot d'informaticien à l'écran.** « Installer sur l'ordinateur »,
   pas « PWA » ; « Présence », pas « mode classe ». Le vocabulaire technique
   reste dans le code.
3. **Des boutons qu'on voit, pas des menus qu'on cherche.** Trois choix côte
   à côte plutôt qu'une liste déroulante à ouvrir.
4. **La valeur par défaut est le cas fréquent.** On ne touche qu'aux
   exceptions, jamais à la règle.
5. **Toujours un aperçu avant une action groupée.** Une phrase dit ce qui va
   se passer avant toute action sur plusieurs élèves à la fois.
6. **Le même geste d'un écran à l'autre.** Ce qu'on apprend sur un écran sert
   sur le suivant.
7. **Un texte de moins vaut mieux qu'une phrase d'explication.** Le mode
   d'emploi vit dans la conception de l'écran, pas dans un paragraphe d'aide
   permanent.
8. **Chercher, pas remplir.** Quand une liste existe déjà, on tape deux
   lettres plutôt que de lire un paragraphe pour comprendre un champ.

## 6. Motifs d'interaction — *nouveau, à construire*

Ces motifs n'existent pas encore en code. Ils réutilisent exclusivement les
jetons et composants ci-dessus — aucune nouvelle couleur, aucun nouveau rayon.

### Groupe à trois états (`choice-group`)

Remplace un menu déroulant quand il y a exactement 2 ou 3 choix mutuellement
exclusifs et fréquents (présence : Présent/Retard/Absent ; réinscription :
Monte/Redouble/Part). Boutons accolés, état actif rempli avec le ton
correspondant (`success`/`warning`/`danger` selon §1), état inactif en
`outline`. Le premier choix — le cas fréquent — est présélectionné.

### Carte de choix (`mode-picker`)

Remplace une case à cocher quand le choix est structurant et rare (mode
d'une classe, à la création seulement). Deux cartes larges côte à côte,
glyphe + titre + une phrase, bordure `primary` et fond `primary-container`
doux sur la carte sélectionnée. Jamais plus de deux cartes sans repasser par
un menu classique.

### Étapes (`stepper` / filmstrip)

Pour tout flux de plus d'un écran (réinscription, nouvelle année scolaire,
inscription d'une école) : une ligne de pastilles numérotées en tête d'écran,
l'étape courante en `primary` plein, les étapes passées cochées. Jamais plus
de 3 étapes ; un flux qui en demande davantage doit être redécoupé.

### Liste de tâches d'accueil (`checklist`)

Remplace un tableau de bord vide à la première connexion d'une école
nouvellement inscrite. Trois tâches maximum, dans l'ordre où elles ont du
sens (classes → enseignants → élèves), compteur « X sur 3 terminé ».

### Aperçu avant action groupée

Avant toute action qui touche plusieurs lignes à la fois (réinscrire une
classe, dupliquer une année scolaire), afficher ce qui va se passer en une
phrase avec des nombres (« 23 élèves montent en CE1 A · 2 redoublent »),
jamais un simple bouton « Confirmer » sans résumé.

## 7. Ton et rédaction — *existant + nouveau*

- Pas de jargon (`token`, `payload`, `sous-domaine`, `rôle insuffisant`…) —
  couvert par `assertPlainFrench()` dans `tests/messages.test.ts` côté
  backend ; même exigence côté frontend.
- Une aide permanente en `hint` sous un champ est un signal que l'écran doit
  être repensé (principe 7) — pas un renfort à ajouter.
- **Notifications push** : le prénom de l'enfant en premier (un parent suit
  parfois plusieurs enfants), le même mot que dans l'écran source (« Absent »
  reste « Absent », jamais reformulé), ton neutre pour une absence — pas de
  ponctuation d'alerte, ce n'est pas une urgence.
