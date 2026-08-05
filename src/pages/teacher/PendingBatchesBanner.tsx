import type { PendingBatch } from '../../lib/offlineQueue';
import { formatRelative, plural } from '../../lib/format';
import { Alert, Button } from '../../ui';

/**
 * Saisies en attente d'envoi.
 *
 * Une file invisible est une file oubliée : l'enseignant doit voir ce qui
 * n'est pas encore parti, et pouvoir le relancer lui-même sans attendre que
 * le navigateur détecte le retour du réseau.
 */
export function PendingBatchesBanner({
  pending, isOnline, onRetry, onDiscard,
}: {
  pending: PendingBatch[];
  isOnline: boolean;
  onRetry: () => void;
  onDiscard: (id: string) => void;
}) {
  if (pending.length === 0) {
    if (isOnline) return null;
    return (
      <Alert tone="info">
        Vous êtes hors connexion. La saisie reste possible : vos notes seront envoyées
        automatiquement au retour du réseau.
      </Alert>
    );
  }

  return (
    <Alert tone={isOnline ? 'info' : 'danger'}>
      <div style={{ flex: 1 }}>
        <strong>
          {pending.length} {plural(pending.length, 'saisie')} pas encore{' '}
          {pending.length > 1 ? 'envoyées' : 'envoyée'}
        </strong>
        <ul style={{ marginTop: 'var(--space-2)', display: 'grid', gap: 4 }}>
          {pending.map((item) => (
            <li
              key={item.id}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
            >
              <span style={{ flex: 1 }}>
                {item.label}{' '}
                <span className="t-subtle">· gardée {formatRelative(item.queuedAt)}</span>
                {item.lastError ? (
                  <span style={{ color: 'var(--error)' }}> · {item.lastError}</span>
                ) : null}
              </span>
              <Button size="sm" variant="ghost" onClick={() => onDiscard(item.id)}>
                Abandonner
              </Button>
            </li>
          ))}
        </ul>
        <p className="t-label-sm" style={{ marginTop: 'var(--space-2)', textTransform: 'none' }}>
          {isOnline
            ? 'Réessai automatique en cours.'
            : "Envoi dès le retour de la connexion. Aucun doublon possible : le serveur reconnaît une saisie déjà enregistrée."}
        </p>
      </div>
      {isOnline ? (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Réessayer
        </Button>
      ) : null}
    </Alert>
  );
}
