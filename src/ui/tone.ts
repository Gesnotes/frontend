export type ChipTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

/** Tonalité d'un statut de présence : présent en vert, retard en orange, absent en rouge. */
export function attendanceTone(status: 'present' | 'absent' | 'late'): ChipTone {
  if (status === 'present') return 'success';
  if (status === 'late') return 'warning';
  return 'danger';
}

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

/**
 * Classes Tailwind d'un badge de tonalité — pour les écrans admin reconstruits
 * en Tailwind/DaisyUI (cf. maquette Front-Admin), hors du système `ui-chip`.
 */
export function toneClasses(tone: ChipTone): string {
  switch (tone) {
    case 'success':
      return 'bg-emerald-100 text-emerald-700';
    case 'danger':
      return 'bg-red-100 text-red-700';
    case 'warning':
      return 'bg-amber-100 text-amber-700';
    case 'info':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
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
