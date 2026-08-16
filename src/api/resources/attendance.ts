import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../http';
import { queryKeys } from '../queryKeys';
import type {
  AttendanceBatchPayload, AttendanceBatchResult, AttendanceSheet, ChildAttendanceRecord, ID, IsoDate,
} from '../types';

/**
 * Présence : un statut par élève, par jour, et — pour les classes mode
 * `notes` — par créneau (voir `attendance.service.ts` côté backend). Les
 * classes mode `presence` (maternelle/garderie) gardent le flux classique
 * (admin ou référent, un appel par jour, sans créneau).
 */

/** Classe (mode `presence`) ou créneau (mode `notes`) — jamais les deux. */
export type AttendanceTarget = { classId: ID; slotId?: undefined } | { classId?: undefined; slotId: ID };

export function fetchAttendanceSheet(target: AttendanceTarget, date: IsoDate): Promise<AttendanceSheet> {
  return api.get<AttendanceSheet>('/teachers/me/attendance', {
    class_id: target.classId,
    slot_id: target.slotId,
    date,
  });
}

export function saveAttendanceBatch(payload: AttendanceBatchPayload): Promise<AttendanceBatchResult> {
  return api.put<AttendanceBatchResult>('/teachers/me/attendance', payload);
}

/** `GET /children/:id/attendance` — historique de présence, côté parent. */
export function fetchChildAttendance(
  childId: ID,
  range: { from?: IsoDate; to?: IsoDate } = {},
): Promise<ChildAttendanceRecord[]> {
  return api.get<ChildAttendanceRecord[]>(`/children/${childId}/attendance`, range);
}

// ------------------------------------------------------------------- Hooks

export function useAttendanceSheet(target: AttendanceTarget | undefined, date: IsoDate) {
  return useQuery({
    queryKey: queryKeys.attendance.sheet(target ?? {}, date),
    queryFn: () => fetchAttendanceSheet(target!, date),
    enabled: target !== undefined,
  });
}

export function useSaveAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveAttendanceBatch,
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.attendance.sheet(variables, variables.date),
      });
    },
  });
}

export function useChildAttendance(childId: ID | undefined) {
  return useQuery({
    queryKey: queryKeys.children.attendance(childId ?? 0),
    queryFn: () => fetchChildAttendance(childId!),
    enabled: childId !== undefined,
  });
}
