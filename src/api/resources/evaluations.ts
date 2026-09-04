import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../http';
import { todayLocalIso } from '../../lib/format';
import { queryKeys } from '../queryKeys';
import type {
  CreateEvaluationPayload,
  Evaluation,
  ID,
  UpdateEvaluationPayload,
  UpcomingEvaluation,
} from '../types';

/** `GET /teachers/me/evaluations` — les évaluations d'un couple classe × matière. */
export function fetchEvaluations(
  classId: ID,
  subjectId: ID,
  termId: ID,
): Promise<Evaluation[]> {
  return api.get<Evaluation[]>('/teachers/me/evaluations', {
    class_id: classId,
    subject_id: subjectId,
    term_id: termId,
  });
}

/**
 * `GET /evaluations` — les évaluations à venir, toute l'école pour l'admin,
 * ses classes pour un enseignant. Le jour envoyé est celui du client, pas le
 * défaut serveur en UTC (même raison que `dashboard.ts::fetchAdminDashboard`).
 */
export function fetchUpcomingEvaluations(): Promise<UpcomingEvaluation[]> {
  return api.get<UpcomingEvaluation[]>('/evaluations', { from: todayLocalIso() });
}

export function createEvaluation(payload: CreateEvaluationPayload): Promise<Evaluation> {
  return api.post<Evaluation>('/teachers/me/evaluations', payload);
}

export function updateEvaluation(id: ID, payload: UpdateEvaluationPayload): Promise<Evaluation> {
  return api.patch<Evaluation>(`/evaluations/${id}`, payload);
}

export function deleteEvaluation(id: ID): Promise<void> {
  return api.delete<void>(`/evaluations/${id}`);
}

// ------------------------------------------------------------------- Hooks

export function useEvaluations(
  classId: ID | undefined,
  subjectId: ID | undefined,
  termId: ID | undefined,
) {
  return useQuery({
    queryKey: queryKeys.teacherMe.evaluations(classId ?? 0, subjectId ?? 0, termId ?? 0),
    queryFn: () => fetchEvaluations(classId!, subjectId!, termId!),
    enabled: classId !== undefined && subjectId !== undefined && termId !== undefined,
  });
}

export function useUpcomingEvaluations() {
  return useQuery({
    queryKey: queryKeys.evaluations.upcoming,
    queryFn: fetchUpcomingEvaluations,
  });
}

/**
 * Créer, renommer ou supprimer une évaluation change la liste des évaluations,
 * la grille de saisie, et — dès qu'elle porte des notes — l'avancement de la
 * saisie affiché sur les cartes classe et le tableau de bord admin.
 */
function useInvalidateEvaluations() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.teacherMe.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.classes.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  };
}

export function useCreateEvaluation() {
  const invalidate = useInvalidateEvaluations();
  return useMutation({ mutationFn: createEvaluation, onSuccess: invalidate });
}

export function useUpdateEvaluation() {
  const invalidate = useInvalidateEvaluations();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateEvaluationPayload & { id: ID }) =>
      updateEvaluation(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteEvaluation() {
  const invalidate = useInvalidateEvaluations();
  return useMutation({ mutationFn: deleteEvaluation, onSuccess: invalidate });
}
