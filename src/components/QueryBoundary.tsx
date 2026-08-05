import type { ReactNode } from 'react';

import { errorMessage } from '../api';
import { ErrorState } from '../ui';

type QueryLike<T> = {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  isFetching?: boolean;
  refetch: () => unknown;
};

type QueryBoundaryProps<T> = {
  query: QueryLike<T>;
  /** Squelette affiché pendant le premier chargement. */
  loading: ReactNode;
  /** Rendu quand la donnée est disponible. */
  children: (data: T) => ReactNode;
  errorTitle?: string;
};

/**
 * Chargement / erreur / donnée, au même endroit pour tous les écrans.
 *
 * Recopier ce triptyque dans chaque page a un coût connu : c'est l'état
 * d'erreur que l'on oublie, et l'écran reste alors vide sans rien expliquer.
 */
export function QueryBoundary<T>({
  query, loading, children, errorTitle,
}: QueryBoundaryProps<T>) {
  if (query.isPending) return <>{loading}</>;

  if (query.isError) {
    return (
      <ErrorState
        title={errorTitle ?? 'Le chargement a échoué'}
        description={errorMessage(query.error)}
        onRetry={() => void query.refetch()}
        retrying={query.isFetching ?? false}
      />
    );
  }

  if (query.data === undefined) return <>{loading}</>;

  return <>{children(query.data)}</>;
}
