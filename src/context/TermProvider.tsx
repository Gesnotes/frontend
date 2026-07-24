import { useMemo, useState, type ReactNode } from 'react';

import { referentialsApi, type ID } from '../api';
import { TermContext, type TermContextValue } from './term-context';

/**
 * Période active de l'application.
 *
 * Presque toutes les routes de consultation exigent un `term_id` : le choix
 * est fait une fois, dans l'en-tête, et suivi par tous les écrans. Sans cela,
 * chaque page rejouerait la règle de sélection par défaut et l'utilisateur
 * verrait deux périodes différentes selon l'écran ouvert.
 */
export function TermProvider({ children }: { children: ReactNode }) {
  const query = referentialsApi.useTerms();
  const [chosen, setChosen] = useState<ID | undefined>(undefined);

  const value = useMemo<TermContextValue>(() => {
    const terms = query.data ?? [];

    /**
     * La sélection explicite n'est retenue que si la période existe encore :
     * une année archivée pendant la session rendrait autrement tous les écrans
     * inconsultables, avec un `term_id` que le backend refuse. Le repli est
     * calculé plutôt que corrigé dans un effet, pour éviter un rendu
     * intermédiaire avec une période invalide.
     */
    const termId = terms.some((term) => term.id === chosen)
      ? chosen
      : referentialsApi.defaultTerm(terms)?.id;

    return {
      terms,
      termId,
      term: terms.find((term) => term.id === termId),
      setTermId: setChosen,
      isLoading: query.isPending,
      isError: query.isError,
      retry: () => void query.refetch(),
    };
  }, [query, chosen]);

  return <TermContext.Provider value={value}>{children}</TermContext.Provider>;
}
