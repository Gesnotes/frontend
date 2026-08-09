import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../http';
import { queryKeys } from '../queryKeys';
import type {
  AttendanceBatchPayload, AttendanceBatchResult, AttendanceSheet, ChildAttendanceRecord, ID, IsoDate,
} from '../types';

/**
 * Présence : un statut par élève et par jour, saisie par l'administration ou
 * l'enseignant référent de la classe (voir `attendance.service.ts` côté
 * backend — jamais « un des professeurs qui y enseignent », pour qu'une
 * classe à plusieurs intervenants ait toujours un responsable de l'appel).
 */

export function fetchAttendanceSheet(classId: ID, date: IsoDate): Promise<AttendanceSheet> {
  return api.get<AttendanceSheet>('/teachers/me/attendance', { class_id: classId, date });
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

export function useAttendanceSheet(classId: ID | undefined, date: IsoDate) {
  return useQuery({
    queryKey: queryKeys.attendance.sheet(classId ?? 0, date),
    queryFn: () => fetchAttendanceSheet(classId!, date),
    enabled: classId !== undefined,
  });
}

export function useSaveAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveAttendanceBatch,
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.attendance.sheet(variables.classId, variables.date),
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
