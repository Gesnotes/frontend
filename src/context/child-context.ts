import { createContext, useContext } from 'react';

import type { ChildSummary, ID } from '../api';

export type ChildContextValue = {
  children: ChildSummary[];
  /** Enfant consulté. `undefined` tant que la liste n'a pas répondu. */
  childId: ID | undefined;
  child: ChildSummary | undefined;
  selectChild: (id: ID) => void;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  retry: () => void;
};

export const ChildContext = createContext<ChildContextValue | null>(null);

export function useChildContext(): ChildContextValue {
  const value = useContext(ChildContext);
  if (!value) throw new Error('useChildContext doit être utilisé à l’intérieur de <ChildProvider>');
  return value;
}
