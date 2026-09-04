import { useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

import { Button } from '../ui';

// Le navigateur ne revérifie le fichier du service worker qu'au chargement du
// document. Or la navigation interne (React Router) n'en refait jamais un
// seul — un enseignant qui garde son onglet ouvert toute la journée ne
// verrait donc jamais passer une mise à jour sans ce sondage périodique.
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

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
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined);

  useEffect(() => {
    updateSW.current = registerSW({
      onNeedRefresh: () => setNeedRefresh(true),
      onOfflineReady: () => setOfflineReady(true),
      onRegisteredSW: (_url, reg) => {
        registration.current = reg;
      },
    });
  }, []);

  useEffect(() => {
    // Un onglet masqué (autre appli au premier plan, écran verrouillé) n'a
    // aucune raison de sonder le réseau ; on revérifie dès qu'il redevient
    // visible, en plus du sondage régulier.
    const checkForUpdate = () => {
      if (document.visibilityState === 'visible') void registration.current?.update();
    };

    const timer = setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', checkForUpdate);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', checkForUpdate);
    };
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
