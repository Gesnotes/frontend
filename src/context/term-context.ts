import { createContext, useContext } from 'react';

import type { ID, Term } from '../api';

export type TermContextValue = {
  terms: Term[];
  /** Période sélectionnée. `undefined` tant que le référentiel n'a pas répondu. */
  termId: ID | undefined;
  term: Term | undefined;
  setTermId: (id: ID) => void;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
};

export const TermContext = createContext<TermContextValue | null>(null);

export function useTermContext(): TermContextValue {
  const value = useContext(TermContext);
  if (!value) throw new Error('useTermContext doit être utilisé à l’intérieur de <TermProvider>');
  return value;
}
