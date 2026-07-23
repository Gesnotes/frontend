import type { CSSProperties, ReactNode } from 'react';
import { color, gradient, shadow, type GradeColor } from '../theme';

export const fadeIn: CSSProperties = { animation: 'gn-fade .3s ease' };

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: color.surface,
        border: `1px solid ${color.line}`,
        borderRadius: 14,
        boxShadow: shadow.card,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Pill({ children, tone, style }: { children: ReactNode; tone: GradeColor; style?: CSSProperties }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 11px',
        borderRadius: 20,
        fontSize: 12.5,
        fontWeight: 700,
        background: tone.bg,
        color: tone.fg,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
      {right ? <div style={{ marginLeft: 'auto' }}>{right}</div> : null}
    </div>
  );
}

export function ProgressBar({ pct, barColor }: { pct: number; barColor: string }) {
  return (
    <div style={{ height: 7, background: color.lineSoft, borderRadius: 20, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: barColor, borderRadius: 20 }} />
    </div>
  );
}

export type ActionKind = 'default' | 'ghost' | 'danger';

const actionStyles: Record<ActionKind, CSSProperties> = {
  default: { background: color.primaryTintSoft, color: color.primary, border: '1px solid #d3e0ff' },
  ghost: { background: color.surface, color: color.primary, border: `1px solid ${color.border}` },
  danger: { background: color.surface, color: color.danger, border: `1px solid ${color.dangerLine}` },
};

export function ActionButton({
  label, onClick, kind = 'default',
}: { label: string; onClick?: () => void; kind?: ActionKind }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, ...actionStyles[kind] }}
    >
      {label}
    </button>
  );
}

export function PrimaryButton({
  children, onClick, style,
}: { children: ReactNode; onClick?: () => void; style?: CSSProperties }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '11px 22px',
        border: 'none',
        borderRadius: 10,
        background: color.primary,
        color: '#fff',
        fontWeight: 600,
        fontSize: 14,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Avatar({ name, size = 32, variant = 'tint' }: { name: string; size?: number; variant?: 'tint' | 'brand' }) {
  const brand = variant === 'brand';
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: brand ? gradient.brand : color.primaryTint,
        color: brand ? '#fff' : color.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.37),
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initialsOf(name)}
    </div>
  );
}

function initialsOf(name: string) {
  const parts = name.replace(/^(M\.|Mme|Mlle)\s+/, '').split(' ');
  return ((parts[0] || '')[0] || '') + ((parts[1] || '')[0] || '');
}

export function Th({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return (
    <th
      style={{
        textAlign: 'left',
        padding: '11px 14px',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '.05em',
        textTransform: 'uppercase',
        color: color.muted,
        borderBottom: `1px solid ${color.line}`,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </th>
  );
}

export function Td({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return (
    <td style={{ padding: '13px 14px', fontSize: 14, borderBottom: `1px solid ${color.lineSoft}`, ...style }}>
      {children}
    </td>
  );
}

export function DataTable({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <Card style={{ overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>{head}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </Card>
  );
}

/** Sélecteur factice : la maquette n'ouvre pas de liste déroulante. */
export function SelectBox({ value }: { value: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        border: `1px solid ${color.border}`,
        borderRadius: 10,
        background: color.surface,
        fontSize: 13.5,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {value}
      <span style={{ color: color.faint }}>▾</span>
    </div>
  );
}

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, background: color.surface, border: `1px solid ${color.line}`, borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 12, color: color.muted, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}

const centeredState: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 420,
  textAlign: 'center',
  ...fadeIn,
};

export function ErrorState({ title, sub, onRetry }: { title: string; sub: string; onRetry: () => void }) {
  return (
    <div style={centeredState}>
      <div
        style={{
          width: 64, height: 64, borderRadius: '50%', background: color.dangerBg, color: color.danger,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800,
        }}
      >
        !
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 18 }}>{title}</div>
      <div style={{ fontSize: 14, color: color.muted, marginTop: 6, maxWidth: 320 }}>{sub}</div>
      <PrimaryButton onClick={onRetry} style={{ marginTop: 20 }}>Réessayer</PrimaryButton>
    </div>
  );
}

export function EmptyState({
  title, sub, cta, onCta,
}: { title: string; sub: string; cta?: string; onCta?: () => void }) {
  return (
    <div style={centeredState}>
      <div
        style={{
          width: 72, height: 72, borderRadius: 18, background: color.primaryTint, color: color.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
        }}
      >
        ▤
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 18 }}>{title}</div>
      <div style={{ fontSize: 14, color: color.muted, marginTop: 6, maxWidth: 340 }}>{sub}</div>
      {cta ? <PrimaryButton onClick={onCta} style={{ marginTop: 20 }}>{cta}</PrimaryButton> : null}
    </div>
  );
}

function Shim({ width, height, style }: { width?: number | string; height: number; style?: CSSProperties }) {
  return <div className="gn-shim" style={{ width, height, ...style }} />;
}

export function DesktopSkeleton() {
  const block = (key: number) => (
    <div
      key={key}
      style={{ background: color.surface, border: `1px solid ${color.line}`, borderRadius: 14, padding: 22, marginBottom: 16 }}
    >
      <Shim width="40%" height={18} style={{ marginBottom: 18 }} />
      {['100%', '90%', '95%', '70%'].map((w) => (
        <Shim key={w} width={w} height={14} style={{ marginBottom: 12 }} />
      ))}
    </div>
  );
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 18 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ background: color.surface, border: `1px solid ${color.line}`, borderRadius: 14, padding: 20 }}>
            <Shim width="60%" height={12} style={{ marginBottom: 14 }} />
            <Shim width="45%" height={26} />
          </div>
        ))}
      </div>
      {[0, 1].map(block)}
    </div>
  );
}

export function ParentSkeleton() {
  return (
    <div style={{ padding: 16 }}>
      <Shim width="50%" height={22} style={{ marginBottom: 10 }} />
      <Shim height={130} style={{ borderRadius: 22, margin: '16px 0' }} />
      <Shim width="40%" height={16} style={{ marginBottom: 10 }} />
      {[0, 1, 2].map((i) => (
        <Shim key={i} height={66} style={{ borderRadius: 14, marginBottom: 10 }} />
      ))}
    </div>
  );
}

export function Toast({ message }: { message: string }) {
  return (
    <div
      style={{
        position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 90,
        background: color.navy, color: '#fff', padding: '14px 20px', borderRadius: 12,
        boxShadow: shadow.toast, display: 'flex', alignItems: 'center', gap: 12,
        fontSize: 14, fontWeight: 500, animation: 'gn-toast-in .3s ease', maxWidth: '90vw',
      }}
    >
      <span
        style={{
          width: 22, height: 22, borderRadius: '50%', background: color.success, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0,
        }}
      >
        ✓
      </span>
      {message}
    </div>
  );
}
