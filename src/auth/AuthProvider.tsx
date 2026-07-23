import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { authApi, sessionStore, type Session } from '../api';
import { AuthContext, fullNameOf, type AuthContextValue } from './auth-context';

/**
 * Source de vérité de la session côté React.
 *
 * L'état est dérivé de `sessionStore` plutôt que dupliqué : le client HTTP
 * purge la session quand un refresh échoue, et l'UI doit basculer sur l'écran
 * de connexion sans qu'aucun composant n'ait à le détecter.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => sessionStore.get());
  const queryClient = useQueryClient();

  useEffect(() => sessionStore.subscribe(setSession), []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const result = await authApi.login(identifier, password);
      // Le cache appartient à l'utilisateur précédent : le vider évite qu'un
      // écran affiche brièvement les données de la session d'avant.
      queryClient.clear();
      return result.user;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      role: session?.user.role ?? null,
      isAuthenticated: session !== null,
      displayName: session ? fullNameOf(session.user) : '',
      login,
      logout,
    }),
    [session, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
