/** Formatage localisé (fr-FR). Aucune donnée métier ici : uniquement de la présentation. */

const gradeFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const decimalFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const integerFormatter = new Intl.NumberFormat('fr-FR');

export const EM_DASH = '—';

/**
 * Jour local du navigateur, au format ISO (`YYYY-MM-DD`).
 *
 * Jamais `new Date().toISOString().slice(0, 10)` : `toISOString()` convertit
 * en UTC, qui n'est le jour réel de l'utilisateur qu'à Greenwich. Une école à
 * l'est de Greenwich (ex. Afrique de l'Ouest/Centrale) verrait sa présence
 * prise en début de soirée locale datée « demain » côté serveur, jusqu'à
 * minuit UTC.
 */
export function todayLocalIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Note ou moyenne : `13.1` → `13,10`. */
export function formatGrade(value: number | null | undefined): string {
  return value == null || Number.isNaN(value) ? EM_DASH : gradeFormatter.format(value);
}

/** Note avec son barème : `15` / `20` → `15 / 20`. */
export function formatGradeOver(value: number | null | undefined, max: number): string {
  return value == null ? EM_DASH : `${decimalFormatter.format(value)} / ${integerFormatter.format(max)}`;
}

export function formatCount(value: number | null | undefined): string {
  return value == null ? EM_DASH : integerFormatter.format(value);
}

export function formatPercent(value: number | null | undefined): string {
  return value == null ? EM_DASH : `${Math.round(value)} %`;
}

/** Accord du pluriel simple : `plural(2, 'note')` → `notes`. */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return count > 1 ? pluralForm : singular;
}

/** Date ISO → `18 juin 2026`. Renvoie une chaîne vide si la date est invalide. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return EM_DASH;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return EM_DASH;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** Date ISO → `18 juin` (sans l'année, pour les listes denses). */
export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return EM_DASH;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return EM_DASH;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });
}

/** Date ISO → `il y a 2 h`, `hier`, `il y a 3 j`. */
export function formatRelative(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return EM_DASH;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return EM_DASH;

  const diffMinutes = Math.round((date.getTime() - now) / 60000);
  const absMinutes = Math.abs(diffMinutes);
  const rtf = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });

  if (absMinutes < 60) return rtf.format(diffMinutes, 'minute');
  if (absMinutes < 60 * 24) return rtf.format(Math.round(diffMinutes / 60), 'hour');
  if (absMinutes < 60 * 24 * 30) return rtf.format(Math.round(diffMinutes / (60 * 24)), 'day');
  return formatDateShort(iso);
}
