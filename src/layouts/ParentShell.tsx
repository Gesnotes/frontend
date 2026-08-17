import { NavLink, Outlet } from 'react-router-dom';

import { AccountSwitcher } from '../components/AccountSwitcher';
import { ChildProvider } from '../context/ChildProvider';
import { TermProvider } from '../context/TermProvider';
import { OfflineBar } from '../pwa/OfflineBar';
import { useForegroundNotifications } from '../push/useForegroundNotifications';
import { paths } from '../routes/paths';

// « Notes » n'est plus un onglet : l'accueil montre déjà moyenne + par
// matière, et la liste complète est à un clic (« Toutes les notes »). Avec
// plusieurs enfants, un onglet Notes global était ambigu (quel enfant ?).
const items = [
  { to: paths.parent.home, label: 'Accueil', icon: '⌂', end: true },
  { to: paths.parent.children, label: 'Enfants', icon: '⚇' },
  { to: paths.parent.notifications, label: 'Alertes', icon: '◔' },
];

/** Coquille mobile de l'espace parent : colonne unique et navigation basse. */
export function ParentShell() {
  useForegroundNotifications();

  return (
    <TermProvider>
      <ChildProvider>
        <div className="parent">
          <OfflineBar />
          <div className="parent__shell-top">
            <AccountSwitcher />
          </div>
          <Outlet />

          <nav className="parent__nav" aria-label="Navigation">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `parent__nav-link${isActive ? ' is-active' : ''}`}
              >
                <span className="parent__nav-icon" aria-hidden="true">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </ChildProvider>
    </TermProvider>
  );
}
