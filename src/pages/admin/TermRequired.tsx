import type { ReactNode } from 'react';

import { useTermContext } from '../../context/term-context';
import { EmptyState, ErrorState, Skeleton } from '../../ui';

/**
 * Garde de période.
 *
 * `term_id` est obligatoire sur les routes de détail et de bulletin. Sans
 * période sélectionnée, l'appel partirait sans le paramètre et le backend
 * répondrait 400 : mieux vaut expliquer que l'établissement n'a pas encore
 * d'année scolaire configurée.
 */
export function TermRequired({ children }: { children: ReactNode }) {
  const { termId, isLoading, isError, retry } = useTermContext();

  if (isLoading) return <Skeleton height={280} />;

  if (isError) {
    return (
      <ErrorState
        title="Périodes indisponibles"
        description="Impossible de charger les périodes scolaires. Les résultats en dépendent."
        onRetry={retry}
      />
    );
  }

  if (termId === undefined) {
    return (
      <EmptyState
        icon="◔"
        title="Aucune période scolaire"
        description="Aucun trimestre n'est configuré pour cet établissement. Les moyennes et les bulletins ne peuvent pas être calculés tant qu'une période n'existe pas."
      />
    );
  }

  return <>{children}</>;
}
