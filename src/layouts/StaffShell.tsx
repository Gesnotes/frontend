import { NavLink, Outlet } from 'react-router-dom';

import { useStaffAuth } from '../staff/staff-auth-context';
import { paths } from '../routes/paths';
import { Avatar, BrandMark } from '../ui';

const NAV = [
  { to: paths.staff.dashboard, label: "Vue d'ensemble", icon: '◫', end: true },
  { to: paths.staff.signupRequests, label: "Demandes d'inscription", icon: '✎', end: false },
  { to: paths.staff.schools, label: 'Écoles', icon: '⌂', end: false },
];

/** Coquille de l'espace staff — pendant d'`AppShell`, sans sélecteur de période (hors périmètre école). */
export function StaffShell() {
  const { staff, displayName, logout } = useStaffAuth();

  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div className="shell__brand">
          <BrandMark />
          <div>
            <div className="shell__brand-name">Gesnotes</div>
            <div className="shell__brand-role">Équipe</div>
          </div>
        </div>

        <nav className="shell__nav" aria-label="Navigation principale">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `shell__nav-link${isActive ? ' is-active' : ''}`}
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
            <div className="shell__user-mail">{staff?.email}</div>
          </div>
          <button className="shell__logout" onClick={() => void logout()} title="Déconnexion">
            ⎋
          </button>
        </div>
      </aside>

      <main className="shell__main">
        <Outlet />
      </main>
    </div>
  );
}
