import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { authApi, sessionStore, TERM_STORAGE_KEY, type Session } from '../api';
import { setMonitoringUser } from '../monitoring/monitoring';
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

  /**
   * Contexte de supervision : identifiant et rôle seulement.
   *
   * Assez pour reproduire un incident — « ça plante pour les enseignants,
   * jamais pour les parents » — sans transporter de donnée nominative.
   */
  useEffect(() => {
    setMonitoringUser(session ? { id: session.user.id, role: session.user.role } : null);
  }, [session]);

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
    /**
     * Le jeton push identifie l'appareil, pas le compte : le laisser
     * enregistré ferait continuer d'arriver les notes des enfants d'un parent
     * sur un téléphone qu'il vient de rendre.
     *
     * Import dynamique : le SDK Firebase ne doit pas entrer dans le bundle
     * initial d'un administrateur, qui n'a aucune notification.
     */
    try {
      const { disablePush } = await import('../push/push');
      await disablePush();
    } catch {
      // Notifications non configurées, ou déjà retirées : la déconnexion
      // reste prioritaire et ne doit jamais échouer pour cette raison.
    }

    await authApi.logout();
    queryClient.clear();

    // La période choisie appartient au compte qui vient de partir : la laisser
    // ferait ouvrir la session suivante sur le trimestre du précédent.
    try {
      localStorage.removeItem(TERM_STORAGE_KEY);
    } catch {
      // Stockage indisponible : rien à purger.
    }
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
