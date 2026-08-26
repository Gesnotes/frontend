import { useId, type ReactNode } from 'react';
import { initials } from '../lib/text';
import { toneColor, type ChipTone } from './tone';

export function Avatar({
  name, size = 36, brand = false,
}: { name: string; size?: number; brand?: boolean }) {
  return (
    <span
      className={`ui-avatar${brand ? ' ui-avatar--brand' : ''}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function ProgressBar({
  value, max = 100, tone = 'info', label,
}: { value: number; max?: number; tone?: ChipTone; label?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      className="ui-progress"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="ui-progress__fill" style={{ width: `${pct}%`, background: toneColor(tone) }} />
    </div>
  );
}

/**
 * Monogramme « GN » : deux lettres identifient Gesnotes sans dépendre d'un
 * seul caractère générique. Le badge coche, concentrique avec l'arrondi du
 * coin bas-droit, rappelle la notification envoyée aux familles dès qu'une
 * note est validée — le différenciateur mis en avant sur la landing.
 * `useId` évite les collisions d'identifiants de dégradé quand plusieurs
 * `BrandMark` apparaissent sur une même page (en-tête + pied de page).
 */
export function BrandMark({ size = 34 }: { size?: number }) {
  const uid = useId();
  const bgId = `${uid}-bg`;
  const badgeId = `${uid}-badge`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      role="img"
      aria-label="Gesnotes"
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--surface-tint)" />
        </linearGradient>
        <linearGradient id={badgeId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--secondary-container)" />
          <stop offset="1" stopColor="var(--secondary)" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill={`url(#${bgId})`} />
      <text
        x="226"
        y="222"
        fill="var(--on-primary)"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="168"
        fontWeight="800"
        textAnchor="middle"
        dominantBaseline="central"
        letterSpacing="-6"
      >
        GN
      </text>
      <circle cx="400" cy="400" r="72" fill={`url(#${badgeId})`} stroke="var(--on-primary)" strokeWidth="8" />
      <path
        d="M368 404 L392 428 L438 372"
        fill="none"
        stroke="var(--on-primary)"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StatTile({
  label, value, unit, hint,
}: { label: string; value: ReactNode; unit?: string; hint?: ReactNode }) {
  return (
    <div className="ui-card ui-card__body" style={{ display: 'grid', gap: 'var(--space-2)' }}>
      <span className="t-label-sm t-muted">{label}</span>
      <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
        {unit ? <span style={{ fontSize: 15, fontWeight: 600, marginLeft: 4, color: 'var(--outline)' }}>{unit}</span> : null}
      </span>
      {hint ? <span className="t-label-sm t-subtle" style={{ textTransform: 'none' }}>{hint}</span> : null}
    </div>
  );
}
