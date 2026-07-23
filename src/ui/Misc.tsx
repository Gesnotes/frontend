import type { ReactNode } from 'react';
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

export function BrandMark({ size = 34, label = 'G' }: { size?: number; label?: string }) {
  return (
    <span
      className="ui-avatar ui-avatar--brand"
      style={{ width: size, height: size, borderRadius: 'var(--radius-md)', fontSize: Math.round(size * 0.5) }}
      aria-hidden="true"
    >
      {label}
    </span>
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
