import {
  Archive, BookOpen, CalendarClock, CalendarDays, CalendarOff, Contact,
  GraduationCap, LayoutDashboard, LogOut, Megaphone, NotebookPen, School, ScrollText, Settings,
  type LucideIcon,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

import { AccountSwitcher } from '../components/AccountSwitcher';
import { useAuth } from '../auth/auth-context';
import { TermProvider } from '../context/TermProvider';
import { OfflineBar } from '../pwa/OfflineBar';
import { paths } from '../routes/paths';
import { Avatar, BrandMark } from '../ui';

type AdminNavItem = { to: string; label: string; icon: LucideIcon; end?: boolean; tourId?: string };

const adminNav: AdminNavItem[] = [
  { to: paths.admin.dashboard, label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: paths.admin.classes, label: 'Classes', icon: School, tourId: 'admin-classes' },
  { to: paths.admin.gradeEntry, label: 'Saisie des notes', icon: NotebookPen },
  { to: paths.admin.annonces, label: 'Annonces & Incidents', icon: Megaphone },
  { to: paths.admin.schedule, label: 'Emploi du temps', icon: CalendarClock },
  { to: paths.admin.subjects, label: 'Matières', icon: BookOpen, tourId: 'admin-subjects' },
  { to: paths.admin.teachers, label: 'Enseignants', icon: Contact, tourId: 'admin-teachers' },
  { to: paths.admin.students, label: 'Élèves', icon: GraduationCap, tourId: 'admin-students' },
  { to: paths.admin.schoolYears, label: 'Années scolaires', icon: CalendarDays, tourId: 'admin-school-years' },
  { to: paths.admin.holidays, label: 'Calendrier scolaire', icon: CalendarOff },
  { to: paths.admin.archives, label: 'Archives', icon: Archive },
  { to: paths.admin.auditLog, label: "Journal d'audit", icon: ScrollText },
  { to: paths.admin.settings, label: 'Paramètres', icon: Settings, tourId: 'admin-settings' },
];

/**
 * Coquille de l'espace administration.
 *
 * Réplique la structure de la maquette Front-Admin (rail fixe 240px, fond
 * clair, pastille pâle sur l'item actif) avec notre bleu institutionnel au
 * lieu du rouge/orange de la maquette. Le sélecteur de période vit dans
 * l'en-tête de chaque page, à l'intérieur du `TermProvider`.
 */
export function AppShell() {
  const { user, displayName, logout } = useAuth();
  if (!user) return null;

  return (
    <TermProvider>
      <div className="min-h-screen bg-[#F6F7FB]">
        <aside className="fixed left-0 top-0 z-20 flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
          <div className="flex items-center gap-3 px-5 pb-4 pt-6">
            <BrandMark />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-gray-900">Gesnotes</div>
              <div className="truncate text-xs text-gray-500">Administration</div>
            </div>
          </div>

          <div className="px-3 pb-3">
            <AccountSwitcher />
          </div>

          <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 pt-2">
            <ul className="flex flex-col gap-1">
              {adminNav.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      data-tour={item.tourId}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-[#dde1ff] text-[#173bab]'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                        }`
                      }
                    >
                      <Icon size={20} aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-gray-100 px-3 py-4">
            <div className="flex items-center gap-3 px-3 pb-2">
              <Avatar name={displayName} size={36} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-gray-900">{displayName}</div>
                <div className="truncate text-xs text-gray-500">{user?.email}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            >
              <LogOut size={20} aria-hidden="true" />
              <span>Déconnexion</span>
            </button>
          </div>
        </aside>

        <main className="ml-60 min-h-screen">
          <OfflineBar />
          <Outlet />
        </main>
      </div>
    </TermProvider>
  );
}
