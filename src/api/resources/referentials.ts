import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../http';
import { queryKeys } from '../queryKeys';
import type { GradeType, ID, Term, TermPayload } from '../types';

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

// --------------------------------------------- Administration des périodes

export function createTerm(payload: TermPayload): Promise<Term> {
  return api.post<Term>('/terms', payload);
}

export function updateTerm(id: ID, payload: Partial<TermPayload>): Promise<Term> {
  return api.patch<Term>(`/terms/${id}`, payload);
}

/** Refusé par le backend dès qu'une note est rattachée à la période. */
export function deleteTerm(id: ID): Promise<void> {
  return api.delete<void>(`/terms/${id}`);
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
 * Toucher aux périodes change les moyennes affichées partout : le sélecteur
 * de l'en-tête, les bulletins, les tableaux de bord et l'espace parent.
 */
function useInvalidateTerms() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of [
      queryKeys.terms.all,
      queryKeys.classes.all,
      queryKeys.dashboard.all,
      queryKeys.teacherMe.all,
      queryKeys.children.all,
      queryKeys.parentMe.all,
    ]) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  };
}

export function useCreateTerm() {
  const invalidate = useInvalidateTerms();
  return useMutation({ mutationFn: createTerm, onSuccess: invalidate });
}

export function useUpdateTerm() {
  const invalidate = useInvalidateTerms();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<TermPayload> & { id: ID }) => updateTerm(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteTerm() {
  const invalidate = useInvalidateTerms();
  return useMutation({ mutationFn: deleteTerm, onSuccess: invalidate });
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

  // D'abord la période dont la date du jour tombe dans les bornes : c'est elle
  // qui est réellement « active », plutôt que la dernière créée (un trimestre
  // clos ne doit pas rester sélectionné par défaut).
  const today = new Date().toISOString().slice(0, 10);
  const containing = terms.find((term) => {
    const start = term.startDate ? term.startDate.slice(0, 10) : null;
    const end = term.endDate ? term.endDate.slice(0, 10) : null;
    return (!start || start <= today) && (!end || today <= end);
  });

  // À défaut (grandes vacances), on retombe sur `isCurrent` puis la dernière
  // connue, pour ne pas laisser l'écran sans sélection.
  return containing ?? terms.find((term) => term.isCurrent) ?? terms[terms.length - 1];
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
