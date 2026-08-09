import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { paths } from '../routes/paths';
import { useStaffAuth } from './staff-auth-context';

/** Barrière d'authentification de l'espace staff — pendant de `RequireAuth`. */
export function RequireStaffAuth() {
  const { isAuthenticated } = useStaffAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={paths.staff.login} replace state={{ from: location }} />;
  }
  return <Outlet />;
}

/** Redirige une session staff déjà ouverte hors de l'écran de connexion. */
export function RedirectIfStaffAuthenticated({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useStaffAuth();
  if (isAuthenticated) return <Navigate to={paths.staff.root} replace />;
  return <>{children}</>;
}
