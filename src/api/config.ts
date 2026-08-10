/** Configuration d'accès à l'API, dérivée des variables d'environnement Vite. */

/**
 * Racine de l'API, sans slash final.
 *
 * Par défaut `/api`, servi par le proxy de développement de Vite (voir
 * `vite.config.ts`). Deux conséquences utiles :
 *
 *  - **même origine**, donc aucun préflight CORS et aucun cookie tiers ;
 *  - l'application reste fonctionnelle depuis un téléphone ou un tunnel HTTPS,
 *    ce qu'une adresse `http://localhost:3000` codée en dur interdit — c'est
 *    la seule façon d'essayer la PWA et les notifications sur un vrai appareil.
 *
 * En production, renseignez `VITE_API_BASE_URL` si l'API n'est pas exposée
 * sous `/api` sur le même domaine.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '');

/**
 * Compte de démonstration public, montré sur la vitrine (« Voir une démo »).
 *
 * Facultatif : le bouton ne s'affiche que si l'identifiant et le mot de passe
 * sont renseignés. Le mot de passe est un identifiant public assumé (le
 * compte est fait pour ça), jamais celui d'un établissement réel.
 */
export const DEMO_IDENTIFIER = import.meta.env.VITE_DEMO_IDENTIFIER ?? '';
export const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? '';

/** Clé de stockage de la session dans `localStorage`. */
export const SESSION_STORAGE_KEY = 'gesnotes.session';

/** Session de l'équipe Gesnotes — clé distincte : les deux mondes ne se mélangent jamais. */
export const STAFF_SESSION_STORAGE_KEY = 'gesnotes.staff-session';

/**
 * Clé de stockage de la période choisie.
 *
 * Le choix survit au rechargement et au passage d'un espace à l'autre : sans
 * cela, chaque retour sur l'application rejouait la sélection par défaut et
 * l'utilisateur devait re-choisir son trimestre à chaque fois.
 */
export const TERM_STORAGE_KEY = 'gesnotes.term';
