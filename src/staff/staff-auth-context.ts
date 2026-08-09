import { createContext, useContext } from 'react';

import type { StaffAuthUser } from '../api';

export type StaffAuthContextValue = {
  staff: StaffAuthUser | null;
  isAuthenticated: boolean;
  /** Nom affichable : identité si connue, sinon l'email. */
  displayName: string;
  login: (email: string, password: string) => Promise<StaffAuthUser>;
  logout: () => Promise<void>;
};

export const StaffAuthContext = createContext<StaffAuthContextValue | null>(null);

export function useStaffAuth(): StaffAuthContextValue {
  const value = useContext(StaffAuthContext);
  if (!value) throw new Error('useStaffAuth doit être utilisé à l’intérieur de <StaffAuthProvider>');
  return value;
}
