import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { staffApi, staffSessionStore, type StaffSession } from '../api';
import { fullNameOf } from '../auth/auth-context';
import { StaffAuthContext, type StaffAuthContextValue } from './staff-auth-context';

/**
 * Source de vérité de la session staff côté React — pendant de `AuthProvider`,
 * pour le monde de l'équipe Gesnotes plutôt que celui d'une école.
 */
export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StaffSession | null>(() => staffSessionStore.get());
  const queryClient = useQueryClient();

  useEffect(() => staffSessionStore.subscribe(setSession), []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await staffApi.login(email, password);
      queryClient.clear();
      return result.staff;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await staffApi.logout();
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<StaffAuthContextValue>(
    () => ({
      staff: session?.staff ?? null,
      isAuthenticated: session !== null,
      displayName: session ? fullNameOf(session.staff) : '',
      login,
      logout,
    }),
    [session, login, logout],
  );

  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>;
}
