import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../http';
import { queryKeys } from '../queryKeys';
import type { SchoolSettings } from '../types';

/** Réglages de l'école courante — pour l'instant, le seuil de passage. */

export function fetchSchoolSettings(): Promise<SchoolSettings> {
  return api.get<SchoolSettings>('/school');
}

export function updatePassingGrade(passingGrade: number): Promise<SchoolSettings> {
  return api.patch<SchoolSettings>('/school', { passingGrade });
}

// ------------------------------------------------------------------- Hooks

export function useSchoolSettings() {
  return useQuery({
    queryKey: queryKeys.school.all,
    queryFn: fetchSchoolSettings,
  });
}

export function useUpdatePassingGrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePassingGrade,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.school.all }),
  });
}
