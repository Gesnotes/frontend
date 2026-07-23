import { useCallback, useEffect, useState } from 'react';

import { errorMessage } from '../api';
import { disablePush, enablePush, pushState, type PushState } from './push';

/**
 * État des notifications pour cet appareil.
 *
 * L'état est relu au montage plutôt que déduit d'un booléen local : la
 * permission peut avoir été révoquée dans les réglages du navigateur depuis
 * la dernière visite, et proposer « désactiver » à quelqu'un qui ne reçoit
 * plus rien serait trompeur.
 */
export function usePush(): {
  state: PushState;
  busy: boolean;
  error: string | null;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
} {
  const [state, setState] = useState<PushState>('inactif');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void pushState().then((next) => {
      if (cancelled) return;
      setState(next);
      setBusy(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const run = useCallback(async (action: () => Promise<PushState>) => {
    setBusy(true);
    setError(null);
    try {
      setState(await action());
    } catch (cause) {
      setError(errorMessage(cause, "Impossible de modifier les notifications sur cet appareil."));
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    state,
    busy,
    error,
    enable: () => run(enablePush),
    disable: () => run(disablePush),
  };
}
