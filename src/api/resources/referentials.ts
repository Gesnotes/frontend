import { useQuery } from '@tanstack/react-query';

import { api } from '../http';
import { queryKeys } from '../queryKeys';
import type { GradeType, Term } from '../types';

/**
 * Périodes et catégories de notes.
 *
 * ⚠️ **Ces deux routes n'existent pas encore côté backend.** Presque tous les
 * écrans ont besoin d'un `term_id` (`/classes/:id`, `/admin/dashboard`,
 * `/children/:id`…) et la saisie d'une note exige un `gradeTypeId` ; aucun
 * endpoint ne permet aujourd'hui de les découvrir. Les chemins ci-dessous sont
 * ceux que l'on attend — `GET /terms` et `GET /grade-types` — pour que le
 * branchement se réduise à leur ajout côté API.
 *
 * En attendant, ces requêtes échouent en 404 et les écrans concernés affichent
 * leur état d'erreur.
 */

export function fetchTerms(): Promise<Term[]> {
  return api.get<Term[]>('/terms');
}

export function fetchGradeTypes(): Promise<GradeType[]> {
  return api.get<GradeType[]>('/grade-types');
}

export function useTerms() {
  return useQuery({
    queryKey: queryKeys.terms.all,
    queryFn: fetchTerms,
    // Un référentiel ne change pas pendant une session de travail.
    staleTime: 30 * 60 * 1000,
  });
}

export function useGradeTypes() {
  return useQuery({
    queryKey: queryKeys.gradeTypes.all,
    queryFn: fetchGradeTypes,
    staleTime: 30 * 60 * 1000,
  });
}
