import { useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

import { Button } from '../ui';

/**
 * Invite à recharger quand une nouvelle version est prête.
 *
 * Mise à jour proposée et non imposée : recharger d'autorité pendant qu'un
 * enseignant saisit une classe lui ferait perdre sa grille.
 */
export function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  // Fonction d'activation du nouveau worker : conservée dans une ref, elle
  // n'a aucune raison de déclencher un rendu.
  const updateSW = useRef<((reload: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    updateSW.current = registerSW({
      onNeedRefresh: () => setNeedRefresh(true),
      onOfflineReady: () => setOfflineReady(true),
    });
  }, []);

  useEffect(() => {
    if (!offlineReady) return;
    const timer = setTimeout(() => setOfflineReady(false), 5000);
    return () => clearTimeout(timer);
  }, [offlineReady]);

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="pwa-prompt" role="status">
      {needRefresh ? (
        <>
          <span>Une nouvelle version de Gesnotes est disponible.</span>
          <Button size="sm" onClick={() => void updateSW.current?.(true)}>
            Mettre à jour
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
            Plus tard
          </Button>
        </>
      ) : (
        <span>Gesnotes est prêt à fonctionner hors connexion.</span>
      )}
    </div>
  );
}
