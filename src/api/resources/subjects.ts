import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../http';
import { queryKeys } from '../queryKeys';
import type { CreateSubjectPayload, ID, Subject, UpdateSubjectPayload } from '../types';

export function fetchSubjects(includeArchived = false): Promise<Subject[]> {
  return api.get<Subject[]>('/subjects', {
    include_archived: includeArchived ? 'true' : 'false',
  });
}

export function createSubject(payload: CreateSubjectPayload) {
  return api.post<Subject>('/subjects', payload);
}

export function updateSubject(id: ID, payload: UpdateSubjectPayload) {
  return api.patch<Subject>(`/subjects/${id}`, payload);
}

/** Archivage par défaut : les notes déjà saisies restent lisibles. */
export function deleteSubject(id: ID, permanent = false) {
  return api.delete<void>(`/subjects/${id}`, { permanent: permanent ? 'true' : 'false' });
}

export function restoreSubject(id: ID) {
  return api.post<Subject>(`/subjects/${id}/restore`);
}

/** Coefficient spécifique à une classe, qui surcharge celui de l'école. */
export function setSubjectCoefficient(id: ID, classId: ID, coefficient: number) {
  return api.put<unknown>(`/subjects/${id}/coefficients/${classId}`, { coefficient });
}

export function removeSubjectCoefficient(id: ID, classId: ID) {
  return api.delete<void>(`/subjects/${id}/coefficients/${classId}`);
}

// ------------------------------------------------------------------- Hooks

export function useSubjects(includeArchived = false) {
  return useQuery({
    queryKey: queryKeys.subjects.list(includeArchived),
    queryFn: () => fetchSubjects(includeArchived),
  });
}

function useInvalidateSubjects() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all });
}

export function useCreateSubject() {
  const invalidate = useInvalidateSubjects();
  return useMutation({ mutationFn: createSubject, onSuccess: invalidate });
}

export function useUpdateSubject() {
  const invalidate = useInvalidateSubjects();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateSubjectPayload & { id: ID }) =>
      updateSubject(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteSubject() {
  const invalidate = useInvalidateSubjects();
  return useMutation({
    mutationFn: ({ id, permanent }: { id: ID; permanent?: boolean }) => deleteSubject(id, permanent),
    onSuccess: invalidate,
  });
}
