import { QueryClient } from '@tanstack/react-query';

import { isApiError } from './ApiError';

/**
 * Configuration React Query.
 *
 * Ne jamais réessayer une erreur 4xx : un 401 déclenche déjà un refresh dans
 * le client HTTP, et un 403 ou 404 ne changera pas d'avis. Seules les erreurs
 * réseau, 429 et 5xx méritent une nouvelle tentative.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (isApiError(error) && !error.isRetryable) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
