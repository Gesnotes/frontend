import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { useAuth } from './auth/auth-context';
import { RedirectIfAuthenticated, RequireAuth, RequireRole } from './auth/guards';
import { AppShell } from './layouts/AppShell';
import { ParentShell } from './layouts/ParentShell';
import { StaffShell } from './layouts/StaffShell';
import { TeacherShell } from './layouts/TeacherShell';
import NotFoundPage from './pages/NotFoundPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import LandingPage from './pages/auth/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import SchoolPickerPage from './pages/auth/SchoolPickerPage';
import SignupPage from './pages/auth/SignupPage';
import { RedirectIfStaffAuthenticated, RequireStaffAuth } from './staff/staff-guards';
import { SkeletonLines } from './ui';
import { DocumentTitle } from './routes/DocumentTitle';
import { homePathFor, paths } from './routes/paths';

/**
 * Les écrans métier sont chargés à la demande.
 *
 * L'application partait en un seul fichier de 609 Ko : un parent sur téléphone
 * téléchargeait l'administration et l'espace enseignant qu'il ne verra jamais.
 * Le découpage suit les trois espaces, qui sont exclusifs par rôle.
 *
 * Les écrans d'authentification restent dans le bundle initial : ce sont eux
 * qu'on affiche en premier, et les différer ferait clignoter la page d'entrée.
 */
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const ClassesPage = lazy(() => import('./pages/admin/ClassesPage'));
const ClassDetailPage = lazy(() => import('./pages/admin/ClassDetailPage'));
const BulletinPage = lazy(() => import('./pages/admin/BulletinPage'));
const SubjectsPage = lazy(() => import('./pages/admin/SubjectsPage'));
const TeachersPage = lazy(() => import('./pages/admin/TeachersPage'));
const StudentsPage = lazy(() => import('./pages/admin/StudentsPage'));
const PeriodsPage = lazy(() => import('./pages/admin/PeriodsPage'));
const SchoolYearsPage = lazy(() => import('./pages/admin/SchoolYearsPage'));
const ArchivesPage = lazy(() => import('./pages/admin/ArchivesPage'));

const GradeEntryPage = lazy(() => import('./pages/teacher/GradeEntryPage'));
const TeacherHistoryPage = lazy(() => import('./pages/teacher/TeacherHistoryPage'));

const ParentHomePage = lazy(() => import('./pages/parent/ParentHomePage'));
const ChildrenPage = lazy(() => import('./pages/parent/ChildrenPage'));
const ChildDetailPage = lazy(() => import('./pages/parent/ChildDetailPage'));
const GradesHistoryPage = lazy(() => import('./pages/parent/GradesHistoryPage'));
const GradeDetailPage = lazy(() => import('./pages/parent/GradeDetailPage'));
const NotificationsPage = lazy(() => import('./pages/parent/NotificationsPage'));

const StaffLoginPage = lazy(() => import('./pages/staff/StaffLoginPage'));
const StaffDashboardPage = lazy(() => import('./pages/staff/StaffDashboardPage'));
const SignupRequestsPage = lazy(() => import('./pages/staff/SignupRequestsPage'));
const SchoolsPage = lazy(() => import('./pages/staff/SchoolsPage'));

/**
 * Attente d'un module de page.
 *
 * Les coquilles (barre latérale, navigation, en-tête) sont déjà à l'écran :
 * seule la zone de contenu est en attente, d'où des lignes fantômes plutôt
 * qu'un écran de chargement pleine page.
 */
function PageFallback() {
  return (
    <div style={{ padding: 'var(--space-8)' }}>
      <SkeletonLines lines={4} />
    </div>
  );
}

/** Racine `/` : renvoie vers l'espace du rôle connecté ; sinon, la vitrine publique. */
function HomeRedirect() {
  const { role } = useAuth();
  if (role) return <Navigate to={homePathFor(role)} replace />;
  return <LandingPage />;
}

export default function App() {
  return (
    <>
      <DocumentTitle />
      <Suspense fallback={<PageFallback />}>
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
          <Route
            path={paths.schoolPicker}
            element={
              <RedirectIfAuthenticated>
                <SchoolPickerPage />
              </RedirectIfAuthenticated>
            }
          />
          <Route
            path={paths.signup}
            element={
              <RedirectIfAuthenticated>
                <SignupPage />
              </RedirectIfAuthenticated>
            }
          />
          {/* Deux chemins : le lien envoyé par le backend pointe sur /reset-password. */}
          <Route path={paths.resetPassword} element={<ResetPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* --- Équipe Gesnotes : monde d'authentification distinct --- */}
          <Route
            path={paths.staff.login}
            element={
              <RedirectIfStaffAuthenticated>
                <StaffLoginPage />
              </RedirectIfStaffAuthenticated>
            }
          />
          <Route element={<RequireStaffAuth />}>
            <Route path={paths.staff.root} element={<StaffShell />}>
              <Route index element={<StaffDashboardPage />} />
              <Route path="demandes" element={<SignupRequestsPage />} />
              <Route path="ecoles" element={<SchoolsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>

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
                <Route path="periodes" element={<PeriodsPage />} />
                <Route path="annees-scolaires" element={<SchoolYearsPage />} />
                <Route path="archives" element={<ArchivesPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>

            <Route element={<RequireRole allow={['teacher']} />}>
              <Route path={paths.teacher.root} element={<TeacherShell />}>
                {/*
                  « Mes classes » a fusionné dans « Saisie » : le choix de la
                  classe ouvre la saisie et porte déjà l'avancement. La racine
                  redirige donc, plutôt que de dupliquer cet écran.
                */}
                <Route index element={<Navigate to={paths.teacher.gradeEntry} replace />} />
                <Route path="saisie" element={<GradeEntryPage />} />
                <Route path="historique" element={<TeacherHistoryPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>

            <Route element={<RequireRole allow={['parent']} />}>
              <Route path={paths.parent.root} element={<ParentShell />}>
                <Route index element={<ParentHomePage />} />
                <Route path="enfants" element={<ChildrenPage />} />
                <Route path="enfants/:childId" element={<ChildDetailPage />} />
                <Route path="notes" element={<GradesHistoryPage />} />
                <Route path="notes/:gradeId" element={<GradeDetailPage />} />
                <Route path="alertes" element={<NotificationsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
