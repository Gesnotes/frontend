import { useOnlineStatus } from '../hooks/useOnlineStatus';

/**
 * Bandeau permanent tant que la connexion est absente.
 *
 * Sans lui, un parent croirait consulter des notes à jour alors qu'il lit un
 * écran figé, et un enseignant ne saurait pas que sa saisie part en file
 * d'attente plutôt que sur le serveur.
 */
export function OfflineBar() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="offline-bar" role="status">
      <span aria-hidden="true">⚠</span>
      Hors connexion — les données affichées peuvent ne pas être à jour
    </div>
  );
}
