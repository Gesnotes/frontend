import { NavLink, Outlet } from 'react-router-dom';

import { ChildProvider } from '../context/ChildProvider';
import { TermProvider } from '../context/TermProvider';
import { paths } from '../routes/paths';

const items = [
  { to: paths.parent.home, label: 'Accueil', icon: '⌂', end: true },
  { to: paths.parent.grades, label: 'Notes', icon: '▤' },
  { to: paths.parent.children, label: 'Enfants', icon: '⚇' },
  { to: paths.parent.notifications, label: 'Alertes', icon: '◔' },
];

/** Coquille mobile de l'espace parent : colonne unique et navigation basse. */
export function ParentShell() {
  return (
    <TermProvider>
      <ChildProvider>
        <div className="parent">
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
