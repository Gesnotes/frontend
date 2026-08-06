import { useQuery } from '@tanstack/react-query';

import { api } from '../http';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { queryKeys } from '../queryKeys';
import type { MessageResponse, SchoolSearchResult, SignupRequestPayload } from '../types';

/**
 * Avant qu'un compte existe : retrouver son école, ou demander à le devenir.
 * Les deux routes sont publiques, jamais soumises à `X-School-Subdomain`.
 */

/** `GET /schools/search` — connexion sans sous-domaine. */
export function searchSchools(query: string): Promise<SchoolSearchResult[]> {
  return api.get<SchoolSearchResult[]>('/schools/search', { q: query });
}

/** `POST /signup-requests` — inscription hybride : capte la demande, rien d'autre. */
export function createSignupRequest(payload: SignupRequestPayload): Promise<MessageResponse> {
  return api.post<MessageResponse>('/signup-requests', payload);
}

// ------------------------------------------------------------------- Hooks

/**
 * Recherche d'école pendant la saisie.
 *
 * Le backend ignore les requêtes de moins de deux caractères ; la saisie est
 * temporisée pour ne pas partir en requête à chaque frappe (même raison que
 * `useParentSearch`).
 */
export function useSchoolSearch(query: string) {
  const trimmed = useDebouncedValue(query.trim());
  return useQuery({
    queryKey: queryKeys.onboarding.schoolSearch(trimmed),
    queryFn: () => searchSchools(trimmed),
    enabled: trimmed.length >= 2,
  });
}
