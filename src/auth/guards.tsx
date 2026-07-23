import { Navigate, Outlet, useLocation } from 'react-router-dom';

import type { Role } from '../api';
import { homePathFor, paths } from '../routes/paths';
import { useAuth } from './auth-context';

/**
 * Barrière d'authentification.
 *
 * La route demandée est mémorisée dans `state.from` pour y revenir après
 * connexion : une session expirée en plein travail ne doit pas renvoyer
 * l'utilisateur à l'accueil.
 */
export function RequireAuth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={paths.login} replace state={{ from: location }} />;
  }
  return <Outlet />;
}

/**
 * Barrière de rôle.
 *
 * Un utilisateur qui atteint un espace qui n'est pas le sien est renvoyé au
 * sien, pas vers une page d'erreur : c'est presque toujours un lien obsolète.
 */
export function RequireRole({ allow }: { allow: Role[] }) {
  const { role } = useAuth();

  if (!role) return <Navigate to={paths.login} replace />;
  if (!allow.includes(role)) return <Navigate to={homePathFor(role)} replace />;
  return <Outlet />;
}

/** Redirige une session déjà ouverte hors des écrans de connexion. */
export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  if (role) return <Navigate to={homePathFor(role)} replace />;
  return <>{children}</>;
}
