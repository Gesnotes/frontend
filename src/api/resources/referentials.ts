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

/**
 * `GET /terms` — triées de la plus ancienne à la plus récente.
 *
 * Les périodes archivées sont exclues côté serveur : elles n'ont rien à faire
 * dans le sélecteur de l'en-tête. Seul l'écran des archives les demande.
 */
export function fetchTerms(includeArchived = false): Promise<Term[]> {
  return api.get<Term[]>(includeArchived ? '/terms?include_archived=true' : '/terms');
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

/**
 * Archivage : la période sort des listes et des sélecteurs, sans rien perdre.
 *
 * C'est le comportement par défaut de la suppression. Le backend ne peut pas
 * effacer une période qui porte des évaluations ou des notes — les clés
 * étrangères sont en `RESTRICT` — et refuser aurait laissé l'administration
 * sans issue face à une période créée par erreur puis utilisée.
 */
export function archiveTerm(id: ID): Promise<void> {
  return api.delete<void>(`/terms/${id}`);
}

/**
 * Suppression définitive depuis les archives : la période, ses évaluations et
 * ses notes disparaissent. Le libellé exact est exigé par le backend.
 */
export function deleteTermPermanently(id: ID, confirmLabel: string): Promise<void> {
  const query = new URLSearchParams({ permanent: 'true', confirm_label: confirmLabel });
  return api.delete<void>(`/terms/${id}?${query.toString()}`);
}

export function restoreTerm(id: ID): Promise<Term> {
  return api.post<Term>(`/terms/${id}/restore`, {});
}

/**
 * Rouvre la saisie sur une période terminée, jusqu'à `until` (instant ISO).
 *
 * Sans cette soupape, une note oubliée après la clôture obligeait
 * l'administration à saisir à la place de l'enseignant, ou à repousser la date
 * de fin du trimestre — ce qui aurait faussé « période en cours ».
 */
export function reopenTerm(id: ID, until: string): Promise<Term> {
  return api.post<Term>(`/terms/${id}/reopen`, { until });
}

/** Referme la saisie avant l'échéance, une fois la correction faite. */
export function closeTermEntry(id: ID): Promise<Term> {
  return api.delete<Term>(`/terms/${id}/reopen`);
}

export function useTerms(includeArchived = false) {
  return useQuery({
    queryKey: queryKeys.terms.list(includeArchived),
    queryFn: () => fetchTerms(includeArchived),
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

export function useArchiveTerm() {
  const invalidate = useInvalidateTerms();
  return useMutation({ mutationFn: archiveTerm, onSuccess: invalidate });
}

export function useRestoreTerm() {
  const invalidate = useInvalidateTerms();
  return useMutation({ mutationFn: restoreTerm, onSuccess: invalidate });
}

export function useReopenTerm() {
  const invalidate = useInvalidateTerms();
  return useMutation({
    mutationFn: ({ id, until }: { id: ID; until: string }) => reopenTerm(id, until),
    onSuccess: invalidate,
  });
}

export function useCloseTermEntry() {
  const invalidate = useInvalidateTerms();
  return useMutation({ mutationFn: closeTermEntry, onSuccess: invalidate });
}

export function useDeleteTermPermanently() {
  const invalidate = useInvalidateTerms();
  return useMutation({
    mutationFn: ({ id, confirmLabel }: { id: ID; confirmLabel: string }) =>
      deleteTermPermanently(id, confirmLabel),
    onSuccess: invalidate,
  });
}

/**
 * Période à sélectionner par défaut.
 *
 * L'ordre des règles vient d'un constat d'audit : le tableau de bord s'ouvrait
 * sur une période sans aucune note, et l'école paraissait inactive. Prendre la
 * dernière de la liste ne marche pas — les périodes sans dates y sont rejetées
 * en fin, si bien qu'un « Trimestre 1 » créé sans bornes devenait le défaut de
 * toute l'application.
 *
 * 1. la période en cours (ses dates couvrent aujourd'hui) ;
 * 2. sinon la plus récente **déjà commencée** — pendant les vacances, on veut
 *    le trimestre qui vient de s'achever, pas celui qui n'a pas démarré ;
 * 3. sinon la première période datée (l'année n'a pas encore commencé) ;
 * 4. en dernier recours seulement, une période sans dates.
 */
export function defaultTerm(terms: Term[] | undefined): Term | undefined {
  if (!terms?.length) return undefined;

  const current = terms.find((term) => term.isCurrent);
  if (current) return current;

  // La liste arrive triée par date de début croissante, périodes sans dates en
  // fin : `dated` conserve cet ordre.
  const dated = terms.filter((term) => term.startDate !== null);
  if (dated.length === 0) return terms[terms.length - 1];

  const today = new Date().toISOString().slice(0, 10);
  const started = dated.filter((term) => term.startDate! <= today);

  return started[started.length - 1] ?? dated[0];
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
