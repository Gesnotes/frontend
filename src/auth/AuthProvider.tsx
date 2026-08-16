import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { authApi, sessionStore, TERM_STORAGE_KEY, type Session } from '../api';
import { offlineQueue } from '../lib/offlineQueue';
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

  /**
   * La file hors-ligne suit le compte connecté, pas la page : cet effet
   * couvre aussi bien la connexion/déconnexion que la purge automatique de
   * `sessionStore` par le client HTTP (refresh expiré) — tout changement de
   * `session`, quelle qu'en soit la cause, fait basculer `offlineQueue` sur
   * le stockage propre au nouveau compte (ou aucun, hors session). Voir
   * `offlineQueue.bind` pour ce que ça protège sur un poste partagé.
   */
  useEffect(() => {
    offlineQueue.bind(session?.user.id ?? null);
  }, [session]);

  const identify = useCallback(
    async (identifier: string, password: string, schoolId?: number) => {
      const result = await authApi.identify(identifier, password, schoolId);
      // Le cache appartient à l'utilisateur précédent : le vider évite qu'un
      // écran affiche brièvement les données de la session d'avant.
      //
      // La file hors-ligne, elle, n'est pas vidée ici : l'effet ci-dessus la
      // fait basculer sur le stockage du compte qui vient de se connecter
      // (`offlineQueue.bind`) — même compte après une expiration de session
      // → sa propre saisie en attente est préservée ; compte différent → sa
      // propre file, jamais celle laissée par le précédent. Seule la
      // déconnexion volontaire (`logout`, ci-dessous) vide explicitement la
      // file du compte courant — c'est là qu'un poste change réellement de
      // main.
      if (result.status === 'ok') queryClient.clear();
      return result;
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

    // `offlineQueue.bind` (effet ci-dessus) empêche déjà qu'un autre compte
    // hérite de cette file. Vider explicitement ici reste une déconnexion
    // volontaire franche : l'enseignant qui quitte son poste ne laisse
    // aucune saisie en attente derrière lui, plutôt que de compter sur le
    // fait qu'il se reconnectera un jour pour la voir rejouée.
    offlineQueue.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      role: session?.user.role ?? null,
      isAuthenticated: session !== null,
      displayName: session ? fullNameOf(session.user) : '',
      identify,
      logout,
    }),
    [session, identify, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
