import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../http';
import { queryKeys } from '../queryKeys';
import type { ID, SchoolYear, SchoolYearPayload } from '../types';

/**
 * Années scolaires : regroupent les périodes et les classes d'une même
 * rentrée. Le rattachement d'une classe ou d'une période à une année reste
 * optionnel — une école qui n'en crée jamais continue de fonctionner comme
 * avant.
 */

export function fetchSchoolYears(includeArchived = false): Promise<SchoolYear[]> {
  return api.get<SchoolYear[]>('/school-years', { include_archived: includeArchived ? 'true' : 'false' });
}

export function createSchoolYear(payload: SchoolYearPayload): Promise<SchoolYear> {
  return api.post<SchoolYear>('/school-years', payload);
}

export function updateSchoolYear(id: ID, payload: Partial<SchoolYearPayload>): Promise<SchoolYear> {
  return api.patch<SchoolYear>(`/school-years/${id}`, payload);
}

/** Archivage : comportement par défaut. Les périodes et classes rattachées ne sont pas archivées avec elle. */
export function archiveSchoolYear(id: ID): Promise<void> {
  return api.delete<void>(`/school-years/${id}`);
}

/** Suppression définitive, depuis les archives : le libellé exact est exigé. */
export function deleteSchoolYearPermanently(id: ID, confirmLabel: string): Promise<void> {
  const query = new URLSearchParams({ permanent: 'true', confirm_label: confirmLabel });
  return api.delete<void>(`/school-years/${id}?${query.toString()}`);
}

export function restoreSchoolYear(id: ID): Promise<SchoolYear> {
  return api.post<SchoolYear>(`/school-years/${id}/restore`, {});
}

// ------------------------------------------------------------------- Hooks

export function useSchoolYears(includeArchived = false) {
  return useQuery({
    queryKey: queryKeys.schoolYears.list(includeArchived),
    queryFn: () => fetchSchoolYears(includeArchived),
  });
}

function useInvalidateSchoolYears() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.schoolYears.all });
}

export function useCreateSchoolYear() {
  const invalidate = useInvalidateSchoolYears();
  return useMutation({ mutationFn: createSchoolYear, onSuccess: invalidate });
}

export function useUpdateSchoolYear() {
  const invalidate = useInvalidateSchoolYears();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<SchoolYearPayload> & { id: ID }) =>
      updateSchoolYear(id, payload),
    onSuccess: invalidate,
  });
}

export function useArchiveSchoolYear() {
  const invalidate = useInvalidateSchoolYears();
  return useMutation({ mutationFn: archiveSchoolYear, onSuccess: invalidate });
}

export function useRestoreSchoolYear() {
  const invalidate = useInvalidateSchoolYears();
  return useMutation({ mutationFn: restoreSchoolYear, onSuccess: invalidate });
}

export function useDeleteSchoolYearPermanently() {
  const invalidate = useInvalidateSchoolYears();
  return useMutation({
    mutationFn: ({ id, confirmLabel }: { id: ID; confirmLabel: string }) =>
      deleteSchoolYearPermanently(id, confirmLabel),
    onSuccess: invalidate,
  });
}
