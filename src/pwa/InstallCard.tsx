import { useSyncExternalStore, useState } from 'react';

import { Alert, BrandMark, Button, Card } from '../ui';
import {
  canPrompt, isIosSafari, isStandalone, promptInstall, subscribeInstall, wasInstalled,
} from './install';

/** Recalculé à chaque émission de `beforeinstallprompt` ou `appinstalled`. */
function snapshot(): string {
  return `${canPrompt()}:${wasInstalled()}:${isStandalone()}`;
}

/**
 * Proposition d'installation.
 *
 * Rendue seulement quand elle a un sens : rien si l'application tourne déjà
 * en mode installé, rien si le navigateur ne sait pas installer. Un bouton
 * « Installer » qui ne fait rien est pire que pas de bouton du tout.
 */
export function InstallCard({ compact = false }: { compact?: boolean }) {
  useSyncExternalStore(subscribeInstall, snapshot, snapshot);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (isStandalone() || wasInstalled() || dismissed) return null;

  const ios = isIosSafari();
  if (!canPrompt() && !ios) return null;

  async function install() {
    setBusy(true);
    try {
      const outcome = await promptInstall();
      if (outcome === 'accepted') setDismissed(true);
    } finally {
      setBusy(false);
    }
  }

  const body = ios ? (
    <Alert tone="info">
      Pour installer Gesnotes : bouton <strong>Partager</strong> de Safari, puis{' '}
      <strong>Sur l'écran d'accueil</strong>. C'est aussi la condition pour recevoir les
      notifications sur iPhone.
    </Alert>
  ) : (
    <Button loading={busy} onClick={() => void install()}>
      Installer l'application
    </Button>
  );

  if (compact) {
    return (
      <Card padded>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <BrandMark size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>Installer Gesnotes</div>
            <div className="t-label-sm t-subtle" style={{ textTransform: 'none' }}>
              Accès direct depuis l'écran d'accueil, et fonctionnement hors connexion.
            </div>
          </div>
          {ios ? null : (
            <Button size="sm" loading={busy} onClick={() => void install()}>
              Installer
            </Button>
          )}
        </div>
        {ios ? <div style={{ marginTop: 'var(--space-3)' }}>{body}</div> : null}
      </Card>
    );
  }

  return (
    <Card padded>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <BrandMark size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="parent__row-title">Installer Gesnotes</p>
          <p className="t-body-md t-muted" style={{ marginTop: 2 }}>
            Ouvrez l'application depuis votre écran d'accueil, sans passer par le navigateur.
            Elle reste consultable hors connexion.
          </p>
        </div>
      </div>
      <div style={{ marginTop: 'var(--space-4)', display: 'grid', gap: 'var(--space-2)' }}>
        {body}
        <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>
          Plus tard
        </Button>
      </div>
    </Card>
  );
}
