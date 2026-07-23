import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../http';
import { queryKeys } from '../queryKeys';
import type {
  CreateGradePayload,
  CreateGradeResult,
  Grade,
  GradeBatchPayload,
  GradeBatchResult,
  GradingTableRow,
  ID,
  ParentGrade,
  TeacherClassAssignment,
  TeacherGradeHistoryItem,
  UpdateGradePayload,
} from '../types';

/** `GET /teachers/me/classes` — mes affectations et l'avancement de la saisie. */
export function fetchMyClasses(termId?: ID): Promise<TeacherClassAssignment[]> {
  return api.get<TeacherClassAssignment[]>('/teachers/me/classes', { term_id: termId });
}

/** `GET /teachers/me/grades` — grille de saisie d'un couple classe × matière. */
export function fetchGradingTable(
  classId: ID,
  subjectId: ID,
  termId: ID,
): Promise<GradingTableRow[]> {
  return api.get<GradingTableRow[]>('/teachers/me/grades', {
    class_id: classId,
    subject_id: subjectId,
    term_id: termId,
  });
}

export function fetchMyGradeHistory(filters: {
  classId?: ID;
  subjectId?: ID;
  termId?: ID;
}): Promise<TeacherGradeHistoryItem[]> {
  return api.get<TeacherGradeHistoryItem[]>('/teachers/me/grades/history', {
    class_id: filters.classId,
    subject_id: filters.subjectId,
    term_id: filters.termId,
  });
}

/** `GET /grades/:id` — détail lisible par le parent comme par l'enseignant. */
export function fetchGrade(id: ID): Promise<ParentGrade> {
  return api.get<ParentGrade>(`/grades/${id}`);
}

export function createGrade(payload: CreateGradePayload): Promise<CreateGradeResult> {
  return api.post<CreateGradeResult>('/grades', payload);
}

/**
 * `PUT /teachers/me/grades` — enregistre une évaluation entière.
 *
 * Idempotent : réémettre le même lot ne crée pas de doublon, il constate que
 * rien n'a changé. C'est ce qui rend la file d'attente hors connexion sûre.
 */
export function saveGradeBatch(payload: GradeBatchPayload): Promise<GradeBatchResult> {
  return api.put<GradeBatchResult>('/teachers/me/grades', payload);
}

export function updateGrade(id: ID, payload: UpdateGradePayload): Promise<Grade> {
  return api.patch<Grade>(`/grades/${id}`, payload);
}

export function deleteGrade(id: ID): Promise<void> {
  return api.delete<void>(`/grades/${id}`);
}

// ------------------------------------------------------------------- Hooks

export function useMyClasses(termId?: ID) {
  return useQuery({
    queryKey: queryKeys.teacherMe.classes(termId),
    queryFn: () => fetchMyClasses(termId),
  });
}

export function useGradingTable(
  classId: ID | undefined,
  subjectId: ID | undefined,
  termId: ID | undefined,
) {
  return useQuery({
    queryKey: queryKeys.teacherMe.gradingTable(classId ?? 0, subjectId ?? 0, termId ?? 0),
    queryFn: () => fetchGradingTable(classId!, subjectId!, termId!),
    enabled: classId !== undefined && subjectId !== undefined && termId !== undefined,
  });
}

export function useMyGradeHistory(filters: { classId?: ID; subjectId?: ID; termId?: ID } = {}) {
  return useQuery({
    queryKey: queryKeys.teacherMe.history(filters.classId, filters.subjectId, filters.termId),
    queryFn: () => fetchMyGradeHistory(filters),
  });
}

export function useGrade(id: ID | undefined) {
  return useQuery({
    queryKey: queryKeys.grades.detail(id ?? 0),
    queryFn: () => fetchGrade(id!),
    enabled: id !== undefined,
  });
}

/**
 * Une note modifiée change les moyennes partout : grille de saisie,
 * historique, détail de classe, bulletins, tableau de bord et espace parent.
 */
function useInvalidateGrades() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of [
      queryKeys.grades.all,
      queryKeys.teacherMe.all,
      queryKeys.classes.all,
      queryKeys.dashboard.all,
      queryKeys.children.all,
      queryKeys.parentMe.all,
    ]) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  };
}

export function useCreateGrade() {
  const invalidate = useInvalidateGrades();
  return useMutation({ mutationFn: createGrade, onSuccess: invalidate });
}

export function useUpdateGrade() {
  const invalidate = useInvalidateGrades();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateGradePayload & { id: ID }) => updateGrade(id, payload),
    onSuccess: invalidate,
  });
}

export function useSaveGradeBatch() {
  const invalidate = useInvalidateGrades();
  return useMutation({ mutationFn: saveGradeBatch, onSuccess: invalidate });
}

export function useDeleteGrade() {
  const invalidate = useInvalidateGrades();
  return useMutation({ mutationFn: deleteGrade, onSuccess: invalidate });
}
