import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../http';
import { queryKeys } from '../queryKeys';
import type { SchoolSettings, UpdateSchoolSettingsPayload } from '../types';

/** Réglages de l'école courante : seuil de passage, coordonnées affichées dans Paramètres. */

export function fetchSchoolSettings(): Promise<SchoolSettings> {
  return api.get<SchoolSettings>('/school');
}

export function updatePassingGrade(passingGrade: number): Promise<SchoolSettings> {
  return api.patch<SchoolSettings>('/school', { passingGrade });
}

export function updateContactInfo(payload: UpdateSchoolSettingsPayload): Promise<SchoolSettings> {
  return api.patch<SchoolSettings>('/school', payload);
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

export function useUpdateContactInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateContactInfo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.school.all }),
  });
}
