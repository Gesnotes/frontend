import {
  CalendarCheck2, CalendarClock, ClipboardCheck, History, LayoutDashboard, LogOut, Megaphone,
  NotebookPen, type LucideIcon,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

import { AccountSwitcher } from '../components/AccountSwitcher';
import { useAuth } from '../auth/auth-context';
import { TermProvider } from '../context/TermProvider';
import { OfflineBar } from '../pwa/OfflineBar';
import { BrandMark } from '../ui';
import { paths } from '../routes/paths';
import { TermSelect } from './TermSelect';

/**
 * Coquille **mobile-first** de l'espace enseignant.
 *
 * Beaucoup d'enseignants n'ont ni ordinateur ni tablette : la saisie doit se
 * faire au téléphone. On reprend donc le parti de l'espace parent — colonne
 * unique, navigation basse au pouce — plutôt que la barre latérale de bureau.
 * Le sélecteur de période vit une fois dans la barre du haut, à l'intérieur du
 * `TermProvider`, et vaut pour tous les écrans.
 */
// « Mes classes » a fusionné dans « Saisie » : la saisie commence par le choix
// de la classe, avec l'avancement affiché sur chaque carte.
const items: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: paths.teacher.dashboard, label: 'Accueil', icon: LayoutDashboard, end: true },
  { to: paths.teacher.gradeEntry, label: 'Saisie', icon: NotebookPen },
  { to: paths.teacher.evaluations, label: 'Évaluations à venir', icon: CalendarCheck2 },
  { to: paths.teacher.attendance, label: 'Présence', icon: ClipboardCheck },
  { to: paths.teacher.annonces, label: 'Annonces', icon: Megaphone },
  { to: paths.teacher.schedule, label: 'Emploi du temps', icon: CalendarClock },
  { to: paths.teacher.history, label: 'Historique', icon: History },
];

export function TeacherShell() {
  const { logout } = useAuth();

  return (
    <TermProvider>
      <div className="flex min-h-full flex-col bg-[#f8f9ff]">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3">
          <div className="flex shrink-0 items-center gap-2">
            <BrandMark size={30} />
            <span className="text-base font-bold max-[480px]:hidden">Gesnotes</span>
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <AccountSwitcher />
            <TermSelect />
            <button
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              onClick={() => void logout()}
              title="Déconnexion"
              aria-label="Se déconnecter"
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        <OfflineBar />

        <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-6 px-4 pb-24 pt-5">
          <Outlet />
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-20 flex justify-center gap-1 border-t border-gray-100 bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
          aria-label="Navigation"
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex max-w-[150px] flex-1 flex-col items-center gap-[3px] rounded-lg py-1.5 text-xs font-semibold ${
                    isActive ? 'bg-[#eff4ff] text-[#1e40af]' : 'text-gray-400'
                  }`
                }
              >
                <Icon size={20} aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </TermProvider>
  );
}
