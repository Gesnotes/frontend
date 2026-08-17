import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, apiFetchBlob } from '../http';
import { queryKeys } from '../queryKeys';
import type { ChildDetail, ChildSummary, Device, ID, ParentGrade, TimetableSlot } from '../types';

/** `GET /parents/me/children` — sans `term_id`, les moyennes valent `null`. */
export function fetchMyChildren(termId?: ID): Promise<ChildSummary[]> {
  return api.get<ChildSummary[]>('/parents/me/children', { term_id: termId });
}

export function fetchChildDetail(id: ID, termId: ID): Promise<ChildDetail> {
  return api.get<ChildDetail>(`/children/${id}`, { term_id: termId });
}

export function fetchChildGrades(
  id: ID,
  filters: { termId?: ID; subjectId?: ID } = {},
): Promise<ParentGrade[]> {
  return api.get<ParentGrade[]>(`/children/${id}/grades`, {
    term_id: filters.termId,
    subject_id: filters.subjectId,
  });
}

/** Emploi du temps de la classe de l'enfant — vide si la classe est en mode présence. */
export function fetchChildSchedule(id: ID): Promise<TimetableSlot[]> {
  return api.get<TimetableSlot[]>(`/children/${id}/schedule`);
}

/** Bulletin PDF d'un seul enfant, sans exposer les résultats de sa classe. */
export function exportChildBulletin(id: ID, termId: ID): Promise<Blob> {
  return apiFetchBlob(`/children/${id}/bulletin/export`, { term_id: termId });
}

// --------------------------------------------------------- Notifications push

export function registerDevice(fcmToken: string) {
  return api.post<{ id: ID; createdAt: string }>('/parents/me/devices', { fcmToken });
}

export function fetchDevices(): Promise<Device[]> {
  return api.get<Device[]>('/parents/me/devices');
}

export function removeDevice(fcmToken: string) {
  return api.delete<void>(`/parents/me/devices/${encodeURIComponent(fcmToken)}`);
}

// ------------------------------------------------------------------- Hooks

export function useMyChildren(termId?: ID) {
  return useQuery({
    queryKey: queryKeys.parentMe.children(termId),
    queryFn: () => fetchMyChildren(termId),
  });
}

export function useChildDetail(id: ID | undefined, termId: ID | undefined) {
  return useQuery({
    queryKey: queryKeys.children.detail(id ?? 0, termId ?? 0),
    queryFn: () => fetchChildDetail(id!, termId!),
    enabled: id !== undefined && termId !== undefined,
  });
}

export function useChildGrades(id: ID | undefined, filters: { termId?: ID; subjectId?: ID } = {}) {
  return useQuery({
    queryKey: queryKeys.children.grades(id ?? 0, filters.termId, filters.subjectId),
    queryFn: () => fetchChildGrades(id!, filters),
    enabled: id !== undefined,
  });
}

export function useChildSchedule(id: ID | undefined) {
  return useQuery({
    queryKey: queryKeys.children.schedule(id ?? 0),
    queryFn: () => fetchChildSchedule(id!),
    enabled: id !== undefined,
  });
}

export function useDevices() {
  return useQuery({ queryKey: queryKeys.parentMe.devices, queryFn: fetchDevices });
}

export function useRegisterDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerDevice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.parentMe.devices }),
  });
}

export function useRemoveDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeDevice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.parentMe.devices }),
  });
}
