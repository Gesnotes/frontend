import { GraduationCap } from 'lucide-react';
import type { ReactNode } from 'react';

import { errorMessage } from '../../api';
import { useChildContext } from '../../context/child-context';
import { useTermContext } from '../../context/term-context';
import { EmptyState, ErrorState, Skeleton } from '../../ui';

/**
 * Garde de l'espace parent.
 *
 * Trois conditions doivent être réunies avant d'afficher quoi que ce soit :
 * les périodes chargées, au moins un enfant associé, et un enfant sélectionné.
 * Un parent sans enfant associé n'est pas une erreur technique mais un
 * paramétrage manquant côté établissement : le message le dit.
 */
export function ChildRequired({ children }: { children: ReactNode }) {
  const term = useTermContext();
  const child = useChildContext();

  if (term.isLoading || child.isLoading) {
    return (
      <div className="parent__cards">
        <Skeleton height={140} radius="var(--radius-xl)" />
        <Skeleton height={72} radius="var(--radius-lg)" />
        <Skeleton height={72} radius="var(--radius-lg)" />
      </div>
    );
  }

  if (child.isError) {
    return (
      <ErrorState
        title="Impossible de charger vos enfants"
        description={errorMessage(child.error)}
        onRetry={child.retry}
      />
    );
  }

  if (term.isError) {
    return (
      <ErrorState
        title="Périodes indisponibles"
        description="Les moyennes sont calculées par trimestre et ne peuvent pas s'afficher sans cette information."
        onRetry={term.retry}
      />
    );
  }

  if (child.children.length === 0) {
    return (
      <EmptyState
        icon={<GraduationCap size={28} />}
        title="Aucun enfant associé"
        description="Votre compte n'est rattaché à aucun élève. Contactez le secrétariat de l'établissement pour faire l'association."
      />
    );
  }

  return <>{children}</>;
}
