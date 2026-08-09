import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, apiFetchBlob } from '../http';
import { queryKeys } from '../queryKeys';
import type {
  BulletinExportFormat,
  ClassDetail,
  ClassListItem,
  CreateClassPayload,
  DuplicateClassPayload,
  ID,
  UpdateClassPayload,
} from '../types';

export function fetchClasses(
  termId?: ID,
  includeArchived = false,
  schoolYearId?: ID,
): Promise<ClassListItem[]> {
  return api.get<ClassListItem[]>('/classes', {
    term_id: termId,
    include_archived: includeArchived ? 'true' : 'false',
    school_year_id: schoolYearId,
  });
}

export function fetchClassDetail(id: ID, termId: ID): Promise<ClassDetail> {
  return api.get<ClassDetail>(`/classes/${id}`, { term_id: termId });
}

export function fetchClassBulletin(id: ID, termId: ID): Promise<ClassDetail> {
  return api.get<ClassDetail>(`/classes/${id}/bulletin`, { term_id: termId });
}

/** Export PDF. `eleves` : une page par élève. `classe` : tableau de synthèse. */
export function exportClassBulletin(
  id: ID,
  termId: ID,
  format: BulletinExportFormat = 'eleves',
): Promise<Blob> {
  return apiFetchBlob(`/classes/${id}/bulletin/export`, { term_id: termId, format });
}

/**
 * Export tableur du bulletin.
 *
 * Le PDF se remet aux familles, le CSV se retravaille — trier par moyenne,
 * isoler une matière, recopier dans le tableau de l'inspection.
 */
export function exportClassBulletinCsv(id: ID, termId: ID): Promise<Blob> {
  return apiFetchBlob(`/classes/${id}/bulletin/csv`, { term_id: termId });
}

export function createClass(payload: CreateClassPayload) {
  return api.post<ClassListItem>('/classes', payload);
}

export function updateClass(id: ID, payload: UpdateClassPayload) {
  return api.patch<ClassListItem>(`/classes/${id}`, payload);
}

/** Archivage par défaut ; `permanent` échoue si des élèves sont rattachés. */
export function deleteClass(id: ID, permanent = false) {
  return api.delete<void>(`/classes/${id}`, { permanent: permanent ? 'true' : 'false' });
}

export function restoreClass(id: ID) {
  return api.post<ClassListItem>(`/classes/${id}/restore`);
}

/**
 * Prépare la rentrée suivante : nouvelle classe dans l'année scolaire visée,
 * reprenant le mode, le référent et les coefficients de celle-ci — jamais les
 * élèves, qui attendent la réinscription.
 */
export function duplicateClass(id: ID, payload: DuplicateClassPayload) {
  return api.post<ClassListItem>(`/classes/${id}/duplicate`, payload);
}

// ------------------------------------------------------------------- Hooks

export function useClasses(termId?: ID, includeArchived = false, schoolYearId?: ID) {
  return useQuery({
    queryKey: queryKeys.classes.list(termId, includeArchived, schoolYearId),
    queryFn: () => fetchClasses(termId, includeArchived, schoolYearId),
  });
}

export function useClassDetail(id: ID | undefined, termId: ID | undefined) {
  return useQuery({
    queryKey: queryKeys.classes.detail(id ?? 0, termId ?? 0),
    queryFn: () => fetchClassDetail(id!, termId!),
    enabled: id !== undefined && termId !== undefined,
  });
}

export function useClassBulletin(id: ID | undefined, termId: ID | undefined) {
  return useQuery({
    queryKey: queryKeys.classes.bulletin(id ?? 0, termId ?? 0),
    queryFn: () => fetchClassBulletin(id!, termId!),
    enabled: id !== undefined && termId !== undefined,
  });
}

/**
 * Invalide toutes les vues classes : liste, détail et bulletins — ainsi que
 * les années scolaires, dont `classCount` est dérivé des classes qui leur
 * sont rattachées.
 */
function useInvalidateClasses() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.classes.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.schoolYears.all });
  };
}

export function useCreateClass() {
  const invalidate = useInvalidateClasses();
  return useMutation({ mutationFn: createClass, onSuccess: invalidate });
}

export function useUpdateClass() {
  const invalidate = useInvalidateClasses();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateClassPayload & { id: ID }) => updateClass(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteClass() {
  const invalidate = useInvalidateClasses();
  return useMutation({
    mutationFn: ({ id, permanent }: { id: ID; permanent?: boolean }) => deleteClass(id, permanent),
    onSuccess: invalidate,
  });
}

export function useRestoreClass() {
  const invalidate = useInvalidateClasses();
  return useMutation({ mutationFn: restoreClass, onSuccess: invalidate });
}

export function useDuplicateClass() {
  const invalidate = useInvalidateClasses();
  return useMutation({
    mutationFn: ({ id, ...payload }: DuplicateClassPayload & { id: ID }) => duplicateClass(id, payload),
    onSuccess: invalidate,
  });
}
