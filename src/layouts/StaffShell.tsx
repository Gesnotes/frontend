import { Inbox, LayoutDashboard, LogOut, School, type LucideIcon } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

import { useStaffAuth } from '../staff/staff-auth-context';
import { paths } from '../routes/paths';
import { Avatar, BrandMark } from '../ui';

const NAV: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: paths.staff.dashboard, label: "Vue d'ensemble", icon: LayoutDashboard, end: true },
  { to: paths.staff.signupRequests, label: "Demandes d'inscription", icon: Inbox },
  { to: paths.staff.schools, label: 'Écoles', icon: School },
];

/** Coquille de l'espace staff — pendant d'`AppShell`, sans sélecteur de période (hors périmètre école). */
export function StaffShell() {
  const { staff, displayName, logout } = useStaffAuth();

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      <aside className="fixed left-0 top-0 z-20 flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
        <div className="flex items-center gap-3 px-5 pb-4 pt-6">
          <BrandMark />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-gray-900">Gesnotes</div>
            <div className="truncate text-xs text-gray-500">Équipe</div>
          </div>
        </div>

        <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 pt-2">
          <ul className="flex flex-col gap-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
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
            <Avatar name={displayName} size={36} brand />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-gray-900">{displayName}</div>
              <div className="truncate text-xs text-gray-500">{staff?.email}</div>
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
        <Outlet />
      </main>
    </div>
  );
}
