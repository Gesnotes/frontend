import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, apiFetchBlob } from '../http';
import { queryKeys } from '../queryKeys';
import { isApiError } from '../ApiError';
import type { SchoolSettings, UpdateSchoolSettingsPayload } from '../types';

/** Réglages de l'école courante : seuil de passage, coordonnées affichées dans Paramètres. */

export type BulletinImageSlot = 'header' | 'footer';

export function fetchSchoolSettings(): Promise<SchoolSettings> {
  return api.get<SchoolSettings>('/school');
}

export function updatePassingGrade(passingGrade: number): Promise<SchoolSettings> {
  return api.patch<SchoolSettings>('/school', { passingGrade });
}

export function updateContactInfo(payload: UpdateSchoolSettingsPayload): Promise<SchoolSettings> {
  return api.patch<SchoolSettings>('/school', payload);
}

/** `null` tant qu'aucune image n'est réglée pour ce créneau (404, attendu — pas une erreur). */
export async function fetchBulletinImage(slot: BulletinImageSlot): Promise<Blob | null> {
  try {
    return await apiFetchBlob(`/school/bulletin-${slot}-image`);
  } catch (cause) {
    if (isApiError(cause) && cause.isNotFound) return null;
    throw cause;
  }
}

/** `dataUrl` : image encodée via `FileReader.readAsDataURL` côté formulaire. */
export function uploadBulletinImage(slot: BulletinImageSlot, dataUrl: string): Promise<SchoolSettings> {
  return api.put<SchoolSettings>(`/school/bulletin-${slot}-image`, { image: dataUrl });
}

export function removeBulletinImage(slot: BulletinImageSlot): Promise<SchoolSettings> {
  return api.delete<SchoolSettings>(`/school/bulletin-${slot}-image`);
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

/**
 * Aperçu d'une image de bulletin. `enabled` sur `hasImage` : sans ça, chaque
 * école sans logo déclencherait quand même une requête pour se voir répondre
 * 404 (géré, mais un aller-retour réseau inutile sur l'écran le plus visité
 * de l'admin).
 */
export function useBulletinImagePreview(slot: BulletinImageSlot, hasImage: boolean) {
  return useQuery({
    queryKey: queryKeys.school.bulletinImage(slot),
    queryFn: () => fetchBulletinImage(slot),
    enabled: hasImage,
  });
}

function useInvalidateBulletinImage(slot: BulletinImageSlot) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.school.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.school.bulletinImage(slot) });
  };
}

export function useUploadBulletinImage(slot: BulletinImageSlot) {
  const invalidate = useInvalidateBulletinImage(slot);
  return useMutation({
    mutationFn: (dataUrl: string) => uploadBulletinImage(slot, dataUrl),
    onSuccess: invalidate,
  });
}

export function useRemoveBulletinImage(slot: BulletinImageSlot) {
  const invalidate = useInvalidateBulletinImage(slot);
  return useMutation({
    mutationFn: () => removeBulletinImage(slot),
    onSuccess: invalidate,
  });
}
