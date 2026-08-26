import {
  Bell, BookOpen, ClipboardCheck, Home, type LucideIcon,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

import { AccountSwitcher } from '../components/AccountSwitcher';
import { ChildProvider } from '../context/ChildProvider';
import { TermProvider } from '../context/TermProvider';
import { OfflineBar } from '../pwa/OfflineBar';
import { useForegroundNotifications } from '../push/useForegroundNotifications';
import { paths } from '../routes/paths';

import { notificationsApi } from '../api';

// Onglets inspirés de la maquette Flutter
const items: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: paths.parent.home, label: 'Accueil', icon: Home, end: true },
  { to: paths.parent.scolarite, label: 'Scolarité', icon: BookOpen },
  { to: paths.parent.suiviParental, label: 'Suivi parental', icon: ClipboardCheck },
  { to: paths.parent.notifications, label: 'Alertes', icon: Bell },
];

/** Coquille mobile de l'espace parent : colonne unique et navigation basse. */
export function ParentShell() {
  useForegroundNotifications();
  const notificationsQuery = notificationsApi.useNotifications(true);
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  return (
    <TermProvider>
      <ChildProvider>
        <div className="flex min-h-full flex-col bg-[#F6F7FB]">
          <OfflineBar />
          <div className="mx-auto flex w-full max-w-[520px] justify-end px-4 pt-3">
            <AccountSwitcher />
          </div>
          <Outlet />

          <nav
            className="fixed inset-x-0 bottom-0 z-20 flex justify-center gap-1 border-t border-gray-100 bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_10px_rgba(0,0,0,0.04)]"
            aria-label="Navigation"
          >
            {items.map((item) => {
              const Icon = item.icon;
              const isAlerts = item.to === paths.parent.notifications;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `relative flex max-w-[130px] flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                      isActive ? 'bg-[#dde1ff] text-[#173bab]' : 'text-gray-400'
                    }`
                  }
                >
                  <div className="relative">
                    <Icon size={20} aria-hidden="true" />
                    {isAlerts && unreadCount > 0 ? (
                      <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    ) : null}
                  </div>
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </ChildProvider>
    </TermProvider>
  );
}
