import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../http';
import { queryKeys } from '../queryKeys';
import type {
  AttendanceBatchPayload, AttendanceBatchResult, AttendanceSheet, ChildAttendanceRecord,
  ClassAttendanceSummary, ID, IsoDate, StudentAttendanceHistoryRecord,
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

/** `GET /classes/:id/attendance-summary` — récap de la classe sur une période : compteurs par élève. */
export function fetchClassAttendanceSummary(classId: ID, termId: ID): Promise<ClassAttendanceSummary> {
  return api.get<ClassAttendanceSummary>(`/classes/${classId}/attendance-summary`, { term_id: termId });
}

/** `GET /students/:id/attendance` — fiche d'absence individuelle, historique complet filtrable par période. */
export function fetchStudentAttendanceHistory(
  studentId: ID,
  termId?: ID,
): Promise<StudentAttendanceHistoryRecord[]> {
  return api.get<StudentAttendanceHistoryRecord[]>(`/students/${studentId}/attendance`, { term_id: termId });
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
    // Le récap par classe et la fiche d'absence d'un élève agrègent les mêmes
    // enregistrements que la feuille du jour : une saisie doit les rafraîchir
    // aussi, pas seulement la feuille qu'on vient de remplir.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
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

export function useClassAttendanceSummary(classId: ID | undefined, termId: ID | undefined) {
  return useQuery({
    queryKey: queryKeys.attendance.classSummary(classId ?? 0, termId ?? 0),
    queryFn: () => fetchClassAttendanceSummary(classId!, termId!),
    enabled: classId !== undefined && termId !== undefined,
  });
}

export function useStudentAttendanceHistory(studentId: ID | undefined, termId: ID | undefined) {
  return useQuery({
    queryKey: queryKeys.attendance.studentHistory(studentId ?? 0, termId),
    queryFn: () => fetchStudentAttendanceHistory(studentId!, termId),
    enabled: studentId !== undefined,
  });
}
