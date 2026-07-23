import { Navigate, Route, Routes } from 'react-router-dom';

import { useAuth } from './auth/auth-context';
import { RedirectIfAuthenticated, RequireAuth, RequireRole } from './auth/guards';
import NotFoundPage from './pages/NotFoundPage';
import UnderConstruction from './pages/UnderConstruction';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import LoginPage from './pages/auth/LoginPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import { homePathFor, paths } from './routes/paths';

/** Racine `/` : renvoie vers l'espace du rôle connecté, sinon vers la connexion. */
function HomeRedirect() {
  const { role } = useAuth();
  return <Navigate to={role ? homePathFor(role) : paths.login} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      {/* --- Écrans publics --- */}
      <Route
        path={paths.login}
        element={
          <RedirectIfAuthenticated>
            <LoginPage />
          </RedirectIfAuthenticated>
        }
      />
      <Route
        path={paths.forgotPassword}
        element={
          <RedirectIfAuthenticated>
            <ForgotPasswordPage />
          </RedirectIfAuthenticated>
        }
      />
      {/* Deux chemins : le lien envoyé par le backend pointe sur /reset-password. */}
      <Route path={paths.resetPassword} element={<ResetPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* --- Espaces authentifiés --- */}
      <Route element={<RequireAuth />}>
        <Route element={<RequireRole allow={['admin']} />}>
          <Route path={`${paths.admin.root}/*`} element={<UnderConstruction space="administration" />} />
        </Route>

        <Route element={<RequireRole allow={['teacher']} />}>
          <Route path={`${paths.teacher.root}/*`} element={<UnderConstruction space="enseignant" />} />
        </Route>

        <Route element={<RequireRole allow={['parent']} />}>
          <Route path={`${paths.parent.root}/*`} element={<UnderConstruction space="parent" />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
