/** Initiales d'un nom, civilité ignorée : `M. Rodrigue Hounkpatin` → `RH`. */
export function initials(name: string): string {
  const parts = name.replace(/^(M\.|Mme|Mlle|Dr)\s+/i, '').trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

/** Prénom seul, pour les salutations. */
export function firstName(name: string): string {
  return name.replace(/^(M\.|Mme|Mlle|Dr)\s+/i, '').trim().split(/\s+/)[0] ?? name;
}
