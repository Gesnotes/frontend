import { useCallback, useMemo, useState, type ReactNode } from 'react';

import { referentialsApi, TERM_STORAGE_KEY, type ID } from '../api';
import { TermContext, type TermContextValue } from './term-context';

/**
 * Période active de l'application.
 *
 * Presque toutes les routes de consultation exigent un `term_id` : le choix
 * est fait une fois, dans l'en-tête, et suivi par tous les écrans. Sans cela,
 * chaque page rejouerait la règle de sélection par défaut et l'utilisateur
 * verrait deux périodes différentes selon l'écran ouvert.
 *
 * Le choix est aussi conservé dans `localStorage`. Le contexte seul ne survit
 * ni au rechargement ni au passage d'un espace à l'autre : l'utilisateur
 * retombait alors sur la période par défaut et devait re-sélectionner son
 * trimestre à chaque retour.
 */
export function TermProvider({ children }: { children: ReactNode }) {
  const query = referentialsApi.useTerms();
  const [chosen, setChosen] = useState<ID | undefined>(readStoredTerm);

  const setTermId = useCallback((id: ID) => {
    setChosen(id);
    writeStoredTerm(id);
  }, []);

  const value = useMemo<TermContextValue>(() => {
    const terms = query.data ?? [];

    /**
     * La sélection explicite n'est retenue que si la période existe encore :
     * une année archivée pendant la session — ou un identifiant hérité d'un
     * autre compte via le stockage — rendrait autrement tous les écrans
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
      setTermId,
      isLoading: query.isPending,
      isError: query.isError,
      retry: () => void query.refetch(),
    };
  }, [query, chosen, setTermId]);

  return <TermContext.Provider value={value}>{children}</TermContext.Provider>;
}

function readStoredTerm(): ID | undefined {
  try {
    const raw = localStorage.getItem(TERM_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  } catch {
    // Stockage indisponible (navigation privée) : on repart du défaut calculé.
    return undefined;
  }
}

function writeStoredTerm(id: ID): void {
  try {
    localStorage.setItem(TERM_STORAGE_KEY, String(id));
  } catch {
    // Écriture impossible : le choix vaut au moins pour la session courante.
  }
}
