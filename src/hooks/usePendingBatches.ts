import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../api';
import { offlineQueue, type FlushReport, type PendingBatch } from '../lib/offlineQueue';
import { useOnlineStatus } from './useOnlineStatus';

const subscribe = (onChange: () => void) => offlineQueue.subscribe(onChange);
const getSnapshot = () => offlineQueue.list();

/**
 * File des saisies en attente, et rejeu automatique au retour du réseau.
 *
 * Le rejeu se déclenche sur l'événement `online` plutôt qu'à intervalle
 * régulier : interroger le serveur en boucle pendant une coupure vide la
 * batterie sans rien accélérer.
 */
export function usePendingBatches(onFlushed?: (report: FlushReport) => void): {
  pending: PendingBatch[];
  isOnline: boolean;
  flush: () => Promise<FlushReport>;
  discard: (id: string) => void;
} {
  const pending = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();

  const flush = useCallback(async () => {
    const report = await offlineQueue.flush();
    if (report.sent > 0) {
      // Les moyennes ont changé partout : grille, bulletins, tableau de bord.
      for (const key of [
        queryKeys.teacherMe.all,
        queryKeys.classes.all,
        queryKeys.dashboard.all,
        queryKeys.children.all,
        queryKeys.parentMe.all,
      ]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    }
    if (report.sent > 0 || report.dropped.length > 0) onFlushed?.(report);
    return report;
  }, [queryClient, onFlushed]);

  useEffect(() => {
    if (isOnline && offlineQueue.size > 0) void flush();
  }, [isOnline, flush]);

  return {
    pending,
    isOnline,
    flush,
    discard: (id: string) => offlineQueue.remove(id),
  };
}
