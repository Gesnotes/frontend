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

/**
 * Compte de démonstration public, montré sur la vitrine (« Voir une démo »).
 *
 * Facultatif : le bouton ne s'affiche que si les trois valeurs sont
 * renseignées. Le mot de passe est un identifiant public assumé (le compte
 * est fait pour ça), jamais celui d'un établissement réel.
 */
export const DEMO_SUBDOMAIN = import.meta.env.VITE_DEMO_SUBDOMAIN ?? '';
export const DEMO_SCHOOL_NAME = import.meta.env.VITE_DEMO_SCHOOL_NAME || 'École de démonstration';
export const DEMO_IDENTIFIER = import.meta.env.VITE_DEMO_IDENTIFIER ?? '';
export const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? '';

/** Clé de stockage de la session dans `localStorage`. */
export const SESSION_STORAGE_KEY = 'gesnotes.session';

/** Session de l'équipe Gesnotes — clé distincte : les deux mondes ne se mélangent jamais. */
export const STAFF_SESSION_STORAGE_KEY = 'gesnotes.staff-session';

/**
 * Clé de stockage de l'école choisie sur cet appareil.
 *
 * Sert la connexion sans sous-domaine : sur le domaine principal, l'école ne
 * vient plus d'une adresse à taper mais d'un choix (recherche, ou lien
 * d'invitation) mémorisé ici — comme la période choisie survit déjà au
 * rechargement. Indépendant de la session : se déconnecter ne doit pas faire
 * oublier l'école sur un appareil qui lui reste dédié.
 */
export const SCHOOL_SELECTION_STORAGE_KEY = 'gesnotes.school';

/**
 * Domaine principal de l'application (vitrine, formulaire d'inscription,
 * sélection d'école). Une adresse qui n'en est pas un sous-domaine dédié
 * (`ecole-x.gesnotes.app`) déclenche la sélection d'école avant la connexion.
 *
 * Étiquettes réservées à la vitrine elle-même, jamais des sous-domaines
 * d'école : à ajuster si l'hébergement de la vitrine change de nom.
 */
export const MAIN_DOMAIN = 'gesnotes.app';
const MAIN_DOMAIN_LABELS = new Set(['www', 'app']);

/**
 * Vrai si l'adresse actuelle est déjà celle d'une école précise. Dans ce cas,
 * le sous-domaine de l'adresse fait autorité côté serveur : la sélection
 * d'école ne doit jamais s'interposer avant la connexion.
 */
export function isOnSchoolSubdomain(hostname = window.location.hostname): boolean {
  const suffix = `.${MAIN_DOMAIN}`;
  if (!hostname.endsWith(suffix)) return false;
  const label = hostname.slice(0, -suffix.length);
  return label !== '' && !MAIN_DOMAIN_LABELS.has(label);
}

/**
 * Clé de stockage de la période choisie.
 *
 * Le choix survit au rechargement et au passage d'un espace à l'autre : sans
 * cela, chaque retour sur l'application rejouait la sélection par défaut et
 * l'utilisateur devait re-choisir son trimestre à chaque fois.
 */
export const TERM_STORAGE_KEY = 'gesnotes.term';
