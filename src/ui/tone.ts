export type ChipTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

/**
 * Tonalité d'une note ramenée sur son barème.
 * Le vert « succès » est réservé aux notes ≥ 85 % conformément au design system.
 */
export function gradeTone(value: number | null | undefined, max = 20): ChipTone {
  if (value == null || max <= 0) return 'neutral';
  const ratio = value / max;
  if (ratio >= 0.85) return 'success';
  if (ratio >= 0.5) return 'info';
  return 'danger';
}

/** Couleur CSS associée à une tonalité, pour les éléments non textuels (barres, jauges). */
export function toneColor(tone: ChipTone): string {
  switch (tone) {
    case 'success':
      return 'var(--secondary)';
    case 'danger':
      return 'var(--error)';
    case 'warning':
      return 'var(--tertiary-container)';
    case 'info':
      return 'var(--primary-container)';
    default:
      return 'var(--outline)';
  }
}
