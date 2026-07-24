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
 * Sous-domaine de l'école, envoyé via `X-School-Subdomain`.
 *
 * **À laisser vide en développement.** Le backend sait déjà quelle école
 * utiliser : son `DEFAULT_SCHOOL_SUBDOMAIN`, ou la seule école présente en
 * base. Renseigner la variable ici crée une seconde source de vérité, et deux
 * fichiers `.env` non versionnés qui divergent produisent un
 * « Identifiants invalides » sur des identifiants corrects.
 *
 * À ne remplir que pour viser volontairement une école précise parmi
 * plusieurs. En production, le nom d'hôte fait autorité.
 */
export const SCHOOL_SUBDOMAIN = import.meta.env.VITE_SCHOOL_SUBDOMAIN ?? '';

/** Clé de stockage de la session dans `localStorage`. */
export const SESSION_STORAGE_KEY = 'gesnotes.session';
