import type { ReactNode } from 'react';

import { Button, ErrorState } from '../ui';
import { Sentry, isMonitoringEnabled } from './monitoring';

/**
 * Dernier filet avant l'écran blanc.
 *
 * Une exception de rendu non interceptée démonte tout l'arbre React :
 * l'utilisateur se retrouve devant une page vide, sans rien comprendre ni
 * pouvoir faire. On affiche au moins de quoi recharger, et l'erreur part vers
 * la supervision quand elle est configurée.
 */
export function AppErrorBoundary({ children }: { children: ReactNode }) {
  // Sans DSN, le composant de Sentry reste utile : il capte le crash et évite
  // l'écran blanc, même si rien n'est envoyé.
  void isMonitoringEnabled;

  return (
    <Sentry.ErrorBoundary fallback={({ resetError }) => <CrashScreen onReset={resetError} />}>
      {children}
    </Sentry.ErrorBoundary>
  );
}

function CrashScreen({ onReset }: { onReset: () => void }) {
  return (
    <main className="auth">
      <div style={{ display: 'grid', gap: 'var(--space-4)', justifyItems: 'center' }}>
        <ErrorState
          title="Un problème est survenu"
          description="L'application a rencontré une erreur inattendue. Vos données ne sont pas perdues : rechargez la page pour reprendre."
          onRetry={onReset}
        />
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Recharger la page
        </Button>
      </div>
    </main>
  );
}
