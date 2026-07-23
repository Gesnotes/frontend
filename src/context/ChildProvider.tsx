import { useMemo, useState, type ReactNode } from 'react';

import { parentApi, type ID } from '../api';
import { ChildContext, type ChildContextValue } from './child-context';
import { useTermContext } from './term-context';

/**
 * Enfant consulté par le parent.
 *
 * Un parent peut suivre plusieurs enfants ; le choix vaut pour tout l'espace
 * (accueil, notes, historique) afin qu'aucun écran n'affiche un autre enfant
 * que celui qu'il vient de sélectionner.
 */
export function ChildProvider({ children }: { children: ReactNode }) {
  const { termId } = useTermContext();
  const query = parentApi.useMyChildren(termId);
  const [chosen, setChosen] = useState<ID | undefined>(undefined);

  const value = useMemo<ChildContextValue>(() => {
    const list = query.data ?? [];
    // Le choix explicite n'est retenu que si l'enfant figure encore dans la
    // liste : une désinscription en cours de session ne doit pas laisser
    // l'espace pointer sur un identifiant que le backend refusera.
    const childId = list.some((c) => c.id === chosen) ? chosen : list[0]?.id;

    return {
      children: list,
      childId,
      child: list.find((c) => c.id === childId),
      selectChild: setChosen,
      isLoading: query.isPending,
      isError: query.isError,
      error: query.error,
      retry: () => void query.refetch(),
    };
  }, [query, chosen]);

  return <ChildContext.Provider value={value}>{children}</ChildContext.Provider>;
}
