/**
 * Règles de saisie partagées avec le backend.
 *
 * Le serveur reste l'autorité : ces contrôles ne servent qu'à dire tout de
 * suite *quel* champ ne va pas, plutôt que de laisser partir une requête vouée
 * au 400. Toute divergence avec la règle serveur se voit à l'usage — un champ
 * refusé ici et accepté là-bas, ou l'inverse.
 */

/**
 * Numéro exploitable : indicatif international facultatif, puis 8 à 15
 * chiffres, une fois retirés espaces, points et séparateurs.
 *
 * Le téléphone est un identifiant de connexion au même titre que l'email. Un
 * numéro mal saisi ne se voit pas à la création : il se découvre le jour où la
 * personne n'arrive pas à se connecter, et personne ne fait le lien.
 */
export function isValidPhone(phone: string): boolean {
  return /^\+?\d{8,15}$/.test(phone.trim().replace(/[\s.\-()]/g, ''));
}

/** Message identique à celui du backend, pour ne pas dire deux choses. */
export const PHONE_FORMAT_MESSAGE =
  'Numéro invalide : 8 à 15 chiffres, avec l’indicatif au besoin (ex. +229 01 97 00 00 00).';

/** Erreur de champ téléphone, `undefined` si vide (facultatif) ou valide. */
export function phoneError(phone: string): string | undefined {
  if (phone.trim() === '') return undefined;
  return isValidPhone(phone) ? undefined : PHONE_FORMAT_MESSAGE;
}

/**
 * Adresse email plausible, au sens du contrôle serveur (`z.email`).
 *
 * Volontairement grossier : le seul verdict qui compte est celui de l'envoi.
 * On refuse ici ce qui est manifestement faux — une adresse sans arobase ou
 * sans domaine — pour ne pas créer un compte que l'invitation n'atteindra
 * jamais.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** Erreur de champ email obligatoire. */
export function emailError(email: string, required = true): string | undefined {
  if (email.trim() === '') return required ? "L'adresse email est requise." : undefined;
  return isValidEmail(email) ? undefined : 'Adresse email invalide (ex. nom@ecole.bj).';
}
