import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../http';
import { queryKeys } from '../queryKeys';
import type { Holiday, HolidayPayload, ID } from '../types';

/**
 * Calendrier scolaire (jours fériés et de congé).
 *
 * Sert uniquement à exclure « aucun appel » du tableau de bord un jour où
 * aucun appel n'est attendu (`AdminDashboard.ferie`) — réservé à
 * l'administration, comme les autres référentiels de gestion.
 */

export function fetchHolidays(includeArchived = false): Promise<Holiday[]> {
  return api.get<Holiday[]>(includeArchived ? '/holidays?include_archived=true' : '/holidays');
}

export function createHoliday(payload: HolidayPayload): Promise<Holiday> {
  return api.post<Holiday>('/holidays', payload);
}

export function updateHoliday(id: ID, payload: Partial<HolidayPayload>): Promise<Holiday> {
  return api.patch<Holiday>(`/holidays/${id}`, payload);
}

/** Archivage : comportement par défaut de la suppression, comme pour les périodes. */
export function archiveHoliday(id: ID): Promise<void> {
  return api.delete<void>(`/holidays/${id}`);
}

export function restoreHoliday(id: ID): Promise<Holiday> {
  return api.post<Holiday>(`/holidays/${id}/restore`, {});
}

/** Suppression définitive depuis les archives : le libellé exact est exigé. */
export function deleteHolidayPermanently(id: ID, confirmLabel: string): Promise<void> {
  const query = new URLSearchParams({ permanent: 'true', confirm_label: confirmLabel });
  return api.delete<void>(`/holidays/${id}?${query.toString()}`);
}

// ------------------------------------------------------------------- Hooks

export function useHolidays(includeArchived = false) {
  return useQuery({
    queryKey: queryKeys.holidays.list(includeArchived),
    queryFn: () => fetchHolidays(includeArchived),
  });
}

/** Un jour férié change aussi l'alerte « aucun appel » du tableau de bord. */
function useInvalidateHolidays() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.holidays.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  };
}

export function useCreateHoliday() {
  const invalidate = useInvalidateHolidays();
  return useMutation({ mutationFn: createHoliday, onSuccess: invalidate });
}

export function useUpdateHoliday() {
  const invalidate = useInvalidateHolidays();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<HolidayPayload> & { id: ID }) => updateHoliday(id, payload),
    onSuccess: invalidate,
  });
}

export function useArchiveHoliday() {
  const invalidate = useInvalidateHolidays();
  return useMutation({ mutationFn: archiveHoliday, onSuccess: invalidate });
}

export function useRestoreHoliday() {
  const invalidate = useInvalidateHolidays();
  return useMutation({ mutationFn: restoreHoliday, onSuccess: invalidate });
}

export function useDeleteHolidayPermanently() {
  const invalidate = useInvalidateHolidays();
  return useMutation({
    mutationFn: ({ id, confirmLabel }: { id: ID; confirmLabel: string }) =>
      deleteHolidayPermanently(id, confirmLabel),
    onSuccess: invalidate,
  });
}
