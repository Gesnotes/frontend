import type { CSSProperties, ReactNode } from 'react';
import { Button } from './Button';

export function Skeleton({
  width = '100%', height = 14, radius, style,
}: { width?: number | string; height?: number | string; radius?: number | string; style?: CSSProperties }) {
  return <div className="ui-skeleton" style={{ width, height, borderRadius: radius, ...style }} aria-hidden="true" />;
}

/** Bloc de chargement générique : n lignes de texte fantômes. */
export function SkeletonLines({ lines = 3 }: { lines?: number }) {
  const widths = ['100%', '92%', '96%', '70%', '85%'];
  return (
    <div style={{ display: 'grid', gap: 'var(--space-3)' }} role="status" aria-label="Chargement">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={widths[i % widths.length]} />
      ))}
    </div>
  );
}

type StateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
};

export function EmptyState({ title, description, icon = '▤', action, secondaryAction }: StateProps) {
  return (
    <div className="ui-state">
      <div className="ui-state__icon" aria-hidden="true">{icon}</div>
      <p className="ui-state__title">{title}</p>
      {description ? <p className="ui-state__body">{description}</p> : null}
      {(action || secondaryAction) && (
        <div className="ui-state__actions">
          {action ? <Button onClick={action.onClick}>{action.label}</Button> : null}
          {secondaryAction ? (
            <Button variant="secondary" onClick={secondaryAction.onClick}>{secondaryAction.label}</Button>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function ErrorState({
  title = 'Impossible de charger les données',
  description = 'Une erreur est survenue. Vérifiez votre connexion puis réessayez.',
  onRetry,
  retrying = false,
}: { title?: string; description?: string; onRetry?: () => void; retrying?: boolean }) {
  return (
    <div className="ui-state" role="alert">
      <div className="ui-state__icon ui-state__icon--danger" aria-hidden="true">!</div>
      <p className="ui-state__title">{title}</p>
      <p className="ui-state__body">{description}</p>
      {onRetry ? (
        <div className="ui-state__actions">
          <Button onClick={onRetry} loading={retrying}>Réessayer</Button>
        </div>
      ) : null}
    </div>
  );
}

export function Alert({
  tone = 'info', children,
}: { tone?: 'info' | 'danger'; children: ReactNode }) {
  return (
    <div className={`ui-alert ui-alert--${tone}`} role={tone === 'danger' ? 'alert' : undefined}>
      {/* Bloc unique : sans lui, un message contenant des éléments inline
          (<strong>…) éclate en plusieurs items flex posés côte à côte sur une
          ligne non retournée, qui débordent de la card en écran étroit. */}
      <div className="ui-alert__content">{children}</div>
    </div>
  );
}
