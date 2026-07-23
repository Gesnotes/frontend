/** Initiales d'un nom, civilité ignorée : `M. Rodrigue Hounkpatin` → `RH`. */
export function initials(name: string): string {
  const parts = name.replace(/^(M\.|Mme|Mlle|Dr)\s+/i, '').trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

/** Prénom seul, pour les salutations. */
export function firstNameOf(name: string): string {
  return name.replace(/^(M\.|Mme|Mlle|Dr)\s+/i, '').trim().split(/\s+/)[0] ?? name;
}

/**
 * Nom affichable d'une personne renvoyée par l'API.
 *
 * `firstName` et `lastName` sont nullables sur `User` : un compte enseignant
 * créé par invitation n'a pas encore d'identité renseignée. Le repli évite
 * d'afficher une ligne vide dans une liste.
 */
export function personName(
  person: { firstName?: string | null; lastName?: string | null } | null | undefined,
  fallback = 'Compte sans nom',
): string {
  if (!person) return fallback;
  const name = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
  return name || fallback;
}
