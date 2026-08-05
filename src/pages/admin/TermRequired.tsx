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
        title="Les trimestres n'ont pas pu être chargés"
        description="Sans eux, aucune moyenne ne peut s'afficher. Vérifiez votre connexion, puis appuyez sur « Réessayer »."
        onRetry={retry}
      />
    );
  }

  if (termId === undefined) {
    return (
      <EmptyState
        icon="◔"
        title="Aucun trimestre n'a encore été créé"
        description="Les moyennes et les bulletins se calculent par trimestre. Créez-en un depuis l'écran « Périodes » pour que les résultats s'affichent."
      />
    );
  }

  return <>{children}</>;
}
