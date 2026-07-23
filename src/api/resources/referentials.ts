import { useQuery } from '@tanstack/react-query';

import { api } from '../http';
import { queryKeys } from '../queryKeys';
import type { GradeType, ID, Term } from '../types';

/**
 * Référentiels de l'établissement : périodes et catégories de notes.
 *
 * `term_id` est obligatoire sur la plupart des écrans de consultation et
 * `gradeTypeId` sur toute saisie de note ; ces deux listes conditionnent donc
 * l'affichage du reste. Elles changent au plus une fois par année scolaire :
 * on les garde longtemps en cache.
 */

const REFERENTIAL_STALE_TIME = 30 * 60 * 1000;

/** `GET /terms` — triées de la plus ancienne à la plus récente. */
export function fetchTerms(): Promise<Term[]> {
  return api.get<Term[]>('/terms');
}

/** `GET /grade-types` — triées par position, réservé à l'équipe pédagogique. */
export function fetchGradeTypes(): Promise<GradeType[]> {
  return api.get<GradeType[]>('/grade-types');
}

export function useTerms() {
  return useQuery({
    queryKey: queryKeys.terms.all,
    queryFn: fetchTerms,
    staleTime: REFERENTIAL_STALE_TIME,
  });
}

export function useGradeTypes() {
  return useQuery({
    queryKey: queryKeys.gradeTypes.all,
    queryFn: fetchGradeTypes,
    staleTime: REFERENTIAL_STALE_TIME,
  });
}

/**
 * Période à sélectionner par défaut.
 *
 * Hors année scolaire (grandes vacances), aucune période n'est « en cours » :
 * on retombe sur la dernière connue plutôt que de laisser l'écran sans
 * sélection, ce qui bloquerait toute consultation.
 */
export function defaultTerm(terms: Term[] | undefined): Term | undefined {
  if (!terms?.length) return undefined;
  return terms.find((term) => term.isCurrent) ?? terms[terms.length - 1];
}

/**
 * Périodes + période sélectionnée par défaut, en une seule dépendance.
 *
 * Presque tous les écrans ont besoin des deux ; les séparer obligeait chacun à
 * réécrire la règle de repli.
 */
export function useTermsWithDefault(): {
  terms: Term[];
  currentTermId: ID | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
} {
  const query = useTerms();
  return {
    terms: query.data ?? [],
    currentTermId: defaultTerm(query.data)?.id,
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}
