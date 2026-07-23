/** Jetons de design Gesnotes (issus de la maquette Claude Design). */
export const color = {
  ink: '#0b1c30',
  inkSoft: '#444653',
  muted: '#757684',
  faint: '#9aa3b5',
  line: '#e5eaf3',
  lineSoft: '#eef1f8',
  border: '#c4c5d5',
  surface: '#fff',
  canvas: '#eef1f8',
  canvasAlt: '#f8f9ff',
  primary: '#1e40af',
  primaryDark: '#00288e',
  primaryAlt: '#3755c3',
  primaryTint: '#e5eeff',
  primaryTintSoft: '#f0f4ff',
  navy: '#0e1b2e',
  navySoft: '#182742',
  navyLine: '#2a3b54',
  navyText: '#9db3d4',
  navyMuted: '#8ea3c4',
  success: '#10b981',
  successFg: '#046c4e',
  successBg: '#d7f5e6',
  danger: '#ba1a1a',
  dangerFg: '#93000a',
  dangerBg: '#ffe4e0',
  dangerLine: '#ffb4ab',
  warnFg: '#8a5a00',
  warnBg: '#fff2d9',
  violetFg: '#5b21b6',
  violetBg: '#efe6ff',
} as const;

export const gradient = {
  brand: `linear-gradient(135deg,${color.primary},${color.primaryAlt})`,
} as const;

export const shadow = {
  card: '0 4px 20px rgba(11,28,48,.05)',
  cardSoft: '0 2px 12px rgba(11,28,48,.04)',
  panel: '0 8px 40px rgba(11,28,48,.10)',
  auth: '0 4px 24px rgba(11,28,48,.07)',
  modal: '0 20px 60px rgba(11,28,48,.35)',
  toast: '0 12px 34px rgba(11,28,48,.30)',
  phone: '0 24px 60px rgba(11,28,48,.28)',
  brand: '0 8px 24px rgba(30,64,175,.28)',
} as const;

export type GradeColor = { bg: string; fg: string };

/** Couleur associée à une note / moyenne sur 20. */
export function gradeColor(v: number | null | undefined): GradeColor {
  if (v == null) return { bg: color.lineSoft, fg: color.muted };
  if (v >= 14) return { bg: color.successBg, fg: color.successFg };
  if (v >= 10) return { bg: '#e0e9ff', fg: color.primary };
  return { bg: color.dangerBg, fg: color.dangerFg };
}

/** Formate une note à la française : 13.1 -> "13,10". */
export function formatGrade(v: number | null | undefined): string {
  return v == null ? '—' : Number(v).toFixed(2).replace('.', ',');
}

/** Initiales d'un nom, en ignorant la civilité. */
export function initials(name: string): string {
  const parts = name.replace(/^(M\.|Mme|Mlle)\s+/, '').split(' ');
  return ((parts[0] || '')[0] || '') + ((parts[1] || '')[0] || '');
}
