import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '../http';
import { queryKeys } from '../queryKeys';
import type { EnrollmentBatchPayload, EnrollmentBatchResult, ID } from '../types';

export function saveEnrollmentDecisions(
  classId: ID,
  payload: EnrollmentBatchPayload,
): Promise<EnrollmentBatchResult> {
  return api.post<EnrollmentBatchResult>(`/classes/${classId}/enrollment-decisions`, payload);
}

// ------------------------------------------------------------------- Hooks

export function useSaveEnrollmentDecisions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, ...payload }: EnrollmentBatchPayload & { classId: ID }) =>
      saveEnrollmentDecisions(classId, payload),
    onSuccess: () => {
      // Déplace des élèves entre classes : effectifs et moyennes des deux
      // classes changent, tout comme la fiche de chaque élève déplacé.
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
    },
  });
}
