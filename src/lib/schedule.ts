import type { ID, Weekday } from '../api/types';

export const WEEKDAYS: { id: Weekday; label: string; short: string }[] = [
  { id: 'lundi', label: 'Lundi', short: 'LUN' },
  { id: 'mardi', label: 'Mardi', short: 'MAR' },
  { id: 'mercredi', label: 'Mercredi', short: 'MER' },
  { id: 'jeudi', label: 'Jeudi', short: 'JEU' },
  { id: 'vendredi', label: 'Vendredi', short: 'VEN' },
  { id: 'samedi', label: 'Samedi', short: 'SAM' },
  { id: 'dimanche', label: 'Dimanche', short: 'DIM' },
];

/** Palette catégorielle (une couleur par matière), pas la couleur de marque. */
const SUBJECT_COLORS = [
  '#2563EB', '#7C3AED', '#DB2777', '#DC2626',
  '#D97706', '#059669', '#0891B2', '#4F46E5',
];

export function colorForSubject(subjectId: ID): string {
  return SUBJECT_COLORS[Math.abs(subjectId) % SUBJECT_COLORS.length]!;
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export const ROW_HEIGHT = 56; // px par heure
export const DEFAULT_START_MIN = 7 * 60;
export const DEFAULT_END_MIN = 18 * 60;

/** Bornes horaires arrondies à l'heure, couvrant tous les créneaux fournis (07:00-18:00 par défaut). */
export function computeHourBounds(times: { startTime: string; endTime: string }[]) {
  let start = DEFAULT_START_MIN;
  let end = DEFAULT_END_MIN;
  for (const slot of times) {
    start = Math.min(start, toMinutes(slot.startTime));
    end = Math.max(end, toMinutes(slot.endTime));
  }
  start = Math.floor(start / 60) * 60;
  end = Math.ceil(end / 60) * 60;

  const hourMarks: number[] = [];
  for (let m = start; m <= end; m += 60) hourMarks.push(m);

  return { gridStartMin: start, gridEndMin: end, hourMarks };
}
