import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../auth/auth-context';
import { TermProvider } from '../context/TermProvider';
import { OfflineBar } from '../pwa/OfflineBar';
import { Avatar, BrandMark } from '../ui';
import { navFor, spaceLabel } from './nav';

/**
 * Coquille des espaces bureau (administration et enseignant).
 *
 * Le sélecteur de période vit dans l'en-tête, à l'intérieur du `TermProvider` :
 * tous les écrans de l'espace lisent la même période.
 */
export function AppShell() {
  const { user, role, displayName, logout } = useAuth();
  if (!role) return null;

  return (
    <TermProvider>
      <div className="shell">
        <aside className="shell__sidebar">
          <div className="shell__brand">
            <BrandMark />
            <div>
              <div className="shell__brand-name">Gesnotes</div>
              <div className="shell__brand-role">{spaceLabel(role)}</div>
            </div>
          </div>

          <nav className="shell__nav" aria-label="Navigation principale">
            {navFor(role).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `shell__nav-link${isActive ? ' is-active' : ''}`
                }
              >
                <span className="shell__nav-icon" aria-hidden="true">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="shell__user">
            <Avatar name={displayName} size={36} brand />
            <div className="shell__user-identity">
              <div className="shell__user-name">{displayName}</div>
              <div className="shell__user-mail">{user?.email}</div>
            </div>
            <button className="shell__logout" onClick={() => void logout()} title="Déconnexion">
              ⎋
            </button>
          </div>
        </aside>

        <div className="shell__main">
          <OfflineBar />
          <Outlet />
        </div>
      </div>
    </TermProvider>
  );
}
