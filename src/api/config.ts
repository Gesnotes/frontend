/** Configuration d'accès à l'API, dérivée des variables d'environnement Vite. */

/** Racine de l'API, sans slash final. */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(
  /\/+$/,
  '',
);

/**
 * Sous-domaine de l'école.
 *
 * En production, le backend le déduit du nom d'hôte. En développement,
 * `req.hostname` vaut `localhost` et ne résout aucune école : l'en-tête
 * `X-School-Subdomain` sert de repli (cf. `schoolContext` côté backend).
 */
export const SCHOOL_SUBDOMAIN = import.meta.env.VITE_SCHOOL_SUBDOMAIN ?? '';

/** Clé de stockage de la session dans `localStorage`. */
export const SESSION_STORAGE_KEY = 'gesnotes.session';
