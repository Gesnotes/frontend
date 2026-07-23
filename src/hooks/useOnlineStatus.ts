import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/**
 * État de la connexion.
 *
 * `navigator.onLine` ne prouve pas que le serveur est joignable — un Wi-Fi
 * captif reste « en ligne » — mais il détecte fiablement l'absence de réseau,
 * ce qui suffit à déclencher le rejeu de la file. Les faux positifs sont
 * rattrapés par les erreurs réseau du client HTTP, qui remettent en attente.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    // Rendu serveur ou pré-rendu : on suppose la connexion présente.
    () => true,
  );
}
