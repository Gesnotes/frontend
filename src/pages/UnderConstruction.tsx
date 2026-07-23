import { useAuth } from '../auth/auth-context';
import { Button, EmptyState } from '../ui';

/**
 * Écran d'attente d'un espace applicatif.
 *
 * Remplacé par les espaces administration, enseignant et parent dans les
 * prochaines livraisons.
 */
export default function UnderConstruction({ space }: { space: string }) {
  const { displayName, logout } = useAuth();

  return (
    <main className="auth">
      <div style={{ display: 'grid', gap: 'var(--space-4)', justifyItems: 'center' }}>
        <EmptyState
          icon="⚙"
          title={`Espace ${space}`}
          description={`Connecté en tant que ${displayName}. Cet espace arrive dans la prochaine livraison.`}
        />
        <Button variant="secondary" onClick={() => void logout()}>Se déconnecter</Button>
      </div>
    </main>
  );
}
