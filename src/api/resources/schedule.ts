import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../http';
import { queryKeys } from '../queryKeys';
import type { CreateSlotPayload, ID, TimetableSlot, UpdateSlotPayload } from '../types';

/** `GET /classes/:id/schedule` — emploi du temps d'une classe. */
export function fetchSchedule(classId: ID, includeArchived = false): Promise<TimetableSlot[]> {
  return api.get<TimetableSlot[]>(`/classes/${classId}/schedule`, {
    include_archived: includeArchived ? 'true' : 'false',
  });
}

export function createSlot(classId: ID, payload: CreateSlotPayload): Promise<TimetableSlot> {
  return api.post<TimetableSlot>(`/classes/${classId}/schedule`, payload);
}

export function updateSlot(classId: ID, slotId: ID, payload: UpdateSlotPayload): Promise<TimetableSlot> {
  return api.patch<TimetableSlot>(`/classes/${classId}/schedule/${slotId}`, payload);
}

/** Archivage : retire le créneau de l'emploi du temps sans rien détruire. */
export function archiveSlot(classId: ID, slotId: ID): Promise<void> {
  return api.delete<void>(`/classes/${classId}/schedule/${slotId}`);
}

export function restoreSlot(classId: ID, slotId: ID): Promise<TimetableSlot> {
  return api.post<TimetableSlot>(`/classes/${classId}/schedule/${slotId}/restore`);
}

/**
 * `GET /teachers/me/schedule` — mes créneaux (classes mode `notes`).
 * Avec `date`, restreint au jour (sélecteur de présence) ; omis, toute la
 * semaine récurrente (vue « mon emploi du temps »).
 */
export function fetchMySchedule(date?: string): Promise<TimetableSlot[]> {
  return api.get<TimetableSlot[]>('/teachers/me/schedule', { date });
}

// ------------------------------------------------------------------- Hooks

export function useSchedule(classId: ID | undefined, includeArchived = false) {
  return useQuery({
    queryKey: queryKeys.schedule.class(classId ?? 0, includeArchived),
    queryFn: () => fetchSchedule(classId!, includeArchived),
    enabled: classId !== undefined,
  });
}

export function useMySchedule(date?: string) {
  return useQuery({
    queryKey: queryKeys.schedule.mine(date),
    queryFn: () => fetchMySchedule(date),
  });
}

/**
 * Un créneau change l'emploi du temps de la classe, l'écran « mes cours du
 * jour » de l'enseignant (lot présence par créneau, à venir) et le résumé
 * du tableau de bord : les trois invalidations restent groupées ici plutôt
 * que dupliquées à chaque appelant.
 */
function useInvalidateSchedule(classId: ID) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.schedule.class(classId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  };
}

export function useCreateSlot(classId: ID) {
  const invalidate = useInvalidateSchedule(classId);
  return useMutation({
    mutationFn: (payload: CreateSlotPayload) => createSlot(classId, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateSlot(classId: ID) {
  const invalidate = useInvalidateSchedule(classId);
  return useMutation({
    mutationFn: ({ slotId, ...payload }: UpdateSlotPayload & { slotId: ID }) =>
      updateSlot(classId, slotId, payload),
    onSuccess: invalidate,
  });
}

export function useArchiveSlot(classId: ID) {
  const invalidate = useInvalidateSchedule(classId);
  return useMutation({ mutationFn: (slotId: ID) => archiveSlot(classId, slotId), onSuccess: invalidate });
}

export function useRestoreSlot(classId: ID) {
  const invalidate = useInvalidateSchedule(classId);
  return useMutation({ mutationFn: (slotId: ID) => restoreSlot(classId, slotId), onSuccess: invalidate });
}
