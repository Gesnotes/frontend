import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../http';
import { queryKeys } from '../queryKeys';
import type {
  CreateTeacherPayload,
  ID,
  MessageResponse,
  Teacher,
  UpdateTeacherPayload,
} from '../types';

export function fetchTeachers(includeArchived = false): Promise<Teacher[]> {
  return api.get<Teacher[]>('/teachers', {
    include_archived: includeArchived ? 'true' : 'false',
  });
}

/**
 * Crée le compte. Aucun mot de passe n'est transmis : l'enseignant reçoit un
 * lien d'invitation pour définir le sien.
 */
export function createTeacher(payload: CreateTeacherPayload) {
  return api.post<Teacher>('/teachers', payload);
}

export function updateTeacher(id: ID, payload: UpdateTeacherPayload) {
  return api.patch<Teacher>(`/teachers/${id}`, payload);
}

/**
 * Désactivation par défaut, les notes saisies étant conservées. La
 * suppression définitive est réservée à un compte déjà désactivé et exige,
 * côté backend, le nom exact en confirmation ; refusée aussi si des notes
 * existent.
 */
export function deleteTeacher(id: ID, permanent = false, confirmLabel = '') {
  return api.delete<void>(`/teachers/${id}`, {
    permanent: permanent ? 'true' : 'false',
    confirm_label: confirmLabel,
  });
}

export function restoreTeacher(id: ID) {
  return api.post<Teacher>(`/teachers/${id}/restore`);
}

/** Renvoie une invitation (email perdu, lien expiré). */
export function resendInvitation(id: ID) {
  return api.post<MessageResponse>(`/teachers/${id}/invitation`);
}

// ------------------------------------------------------------------- Hooks

export function useTeachers(includeArchived = false) {
  return useQuery({
    queryKey: queryKeys.teachers.list(includeArchived),
    queryFn: () => fetchTeachers(includeArchived),
  });
}

function useInvalidateTeachers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.teachers.all });
}

export function useCreateTeacher() {
  const invalidate = useInvalidateTeachers();
  return useMutation({ mutationFn: createTeacher, onSuccess: invalidate });
}

export function useUpdateTeacher() {
  const invalidate = useInvalidateTeachers();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateTeacherPayload & { id: ID }) =>
      updateTeacher(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteTeacher() {
  const invalidate = useInvalidateTeachers();
  return useMutation({
    mutationFn: ({ id, permanent, confirmLabel }: { id: ID; permanent?: boolean; confirmLabel?: string }) =>
      deleteTeacher(id, permanent, confirmLabel),
    onSuccess: invalidate,
  });
}

export function useResendInvitation() {
  return useMutation({ mutationFn: resendInvitation });
}

export function useRestoreTeacher() {
  const invalidate = useInvalidateTeachers();
  return useMutation({ mutationFn: restoreTeacher, onSuccess: invalidate });
}
