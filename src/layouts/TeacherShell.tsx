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
const items = [
  { to: paths.teacher.gradeEntry, label: 'Saisie', icon: '✎', end: true },
  { to: paths.teacher.attendance, label: 'Présence', icon: '✓' },
  { to: paths.teacher.history, label: 'Historique', icon: '↺' },
];

export function TeacherShell() {
  const { logout } = useAuth();

  return (
    <TermProvider>
      <div className="tshell">
        <header className="tshell__top">
          <div className="tshell__brand">
            <BrandMark size={30} />
            <span className="tshell__brand-name">Gesnotes</span>
          </div>
          <div className="tshell__top-actions">
            <AccountSwitcher />
            <TermSelect />
            <button className="tshell__logout" onClick={() => void logout()} title="Déconnexion" aria-label="Se déconnecter">
              ⎋
            </button>
          </div>
        </header>

        <OfflineBar />

        <main className="tshell__body">
          <Outlet />
        </main>

        <nav className="tshell__nav" aria-label="Navigation">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `tshell__nav-link${isActive ? ' is-active' : ''}`}
            >
              <span className="tshell__nav-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </TermProvider>
  );
}
