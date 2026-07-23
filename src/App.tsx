import { Navigate, Route, Routes } from 'react-router-dom';

import { useAuth } from './auth/auth-context';
import { RedirectIfAuthenticated, RequireAuth, RequireRole } from './auth/guards';
import { AppShell } from './layouts/AppShell';
import NotFoundPage from './pages/NotFoundPage';
import UnderConstruction from './pages/UnderConstruction';
import BulletinPage from './pages/admin/BulletinPage';
import ClassDetailPage from './pages/admin/ClassDetailPage';
import ClassesPage from './pages/admin/ClassesPage';
import DashboardPage from './pages/admin/DashboardPage';
import StudentsPage from './pages/admin/StudentsPage';
import SubjectsPage from './pages/admin/SubjectsPage';
import TeachersPage from './pages/admin/TeachersPage';
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
          <Route path={paths.admin.root} element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="classes" element={<ClassesPage />} />
            <Route path="classes/:classId" element={<ClassDetailPage />} />
            <Route path="classes/:classId/bulletin" element={<BulletinPage />} />
            <Route path="matieres" element={<SubjectsPage />} />
            <Route path="enseignants" element={<TeachersPage />} />
            <Route path="eleves" element={<StudentsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
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
