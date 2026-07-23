import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../http';
import { queryKeys } from '../queryKeys';
import type {
  AttachParentPayload,
  CreateStudentPayload,
  ID,
  ParentContact,
  Student,
  StudentPage,
  UpdateStudentPayload,
} from '../types';

type StudentFilters = {
  classId?: ID;
  page?: number;
  includeArchived?: boolean;
};

export function fetchStudents({
  classId,
  page = 1,
  includeArchived = false,
}: StudentFilters = {}): Promise<StudentPage> {
  return api.get<StudentPage>('/students', {
    class_id: classId,
    page,
    include_archived: includeArchived ? 'true' : 'false',
  });
}

export function fetchStudent(id: ID): Promise<Student> {
  return api.get<Student>(`/students/${id}`);
}

export function createStudent(payload: CreateStudentPayload) {
  return api.post<Student>('/students', payload);
}

export function updateStudent(id: ID, payload: UpdateStudentPayload) {
  return api.patch<Student>(`/students/${id}`, payload);
}

/**
 * Archivage par défaut.
 *
 * La suppression définitive efface toute la scolarité et exige, côté backend,
 * le nom exact de l'élève en confirmation.
 */
export function deleteStudent(id: ID, options: { permanent?: boolean; confirmName?: string } = {}) {
  return api.delete<void>(`/students/${id}`, {
    permanent: options.permanent ? 'true' : 'false',
    confirm_name: options.confirmName,
  });
}

export function restoreStudent(id: ID) {
  return api.post<Student>(`/students/${id}/restore`);
}

/** Associe un parent : compte existant (`parentUserId`) ou invitation par email. */
export function attachParent(id: ID, payload: AttachParentPayload) {
  return api.post<Student>(`/students/${id}/parents`, payload);
}

export function detachParent(id: ID, parentId: ID) {
  return api.delete<Student>(`/students/${id}/parents/${parentId}`);
}

/** `GET /parents/search` — recherche d'un compte parent à associer. */
export function searchParents(query: string): Promise<ParentContact[]> {
  return api.get<ParentContact[]>('/parents/search', { q: query });
}

// ------------------------------------------------------------------- Hooks

export function useStudents(filters: StudentFilters = {}) {
  return useQuery({
    queryKey: queryKeys.students.list(filters.classId, filters.page, filters.includeArchived),
    queryFn: () => fetchStudents(filters),
  });
}

export function useStudent(id: ID | undefined) {
  return useQuery({
    queryKey: queryKeys.students.detail(id ?? 0),
    queryFn: () => fetchStudent(id!),
    enabled: id !== undefined,
  });
}

/**
 * Recherche de parents pour l'association.
 *
 * Le backend ignore les requêtes de moins de deux caractères ; on évite
 * l'aller-retour côté client.
 */
export function useParentSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: queryKeys.students.parentSearch(trimmed),
    queryFn: () => searchParents(trimmed),
    enabled: trimmed.length >= 2,
  });
}

function useInvalidateStudents() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
    // L'effectif et les moyennes de classe dépendent des élèves.
    queryClient.invalidateQueries({ queryKey: queryKeys.classes.all });
  };
}

export function useCreateStudent() {
  const invalidate = useInvalidateStudents();
  return useMutation({ mutationFn: createStudent, onSuccess: invalidate });
}

export function useUpdateStudent() {
  const invalidate = useInvalidateStudents();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateStudentPayload & { id: ID }) =>
      updateStudent(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteStudent() {
  const invalidate = useInvalidateStudents();
  return useMutation({
    mutationFn: ({ id, ...options }: { id: ID; permanent?: boolean; confirmName?: string }) =>
      deleteStudent(id, options),
    onSuccess: invalidate,
  });
}

export function useAttachParent() {
  const invalidate = useInvalidateStudents();
  return useMutation({
    mutationFn: ({ id, payload }: { id: ID; payload: AttachParentPayload }) =>
      attachParent(id, payload),
    onSuccess: invalidate,
  });
}

export function useDetachParent() {
  const invalidate = useInvalidateStudents();
  return useMutation({
    mutationFn: ({ id, parentId }: { id: ID; parentId: ID }) => detachParent(id, parentId),
    onSuccess: invalidate,
  });
}

export function useRestoreStudent() {
  const invalidate = useInvalidateStudents();
  return useMutation({ mutationFn: restoreStudent, onSuccess: invalidate });
}
