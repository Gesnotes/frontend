import { Link } from 'react-router-dom';

import { paths } from '../../routes/paths';
import { Button } from '../../ui';
import { AuthLayout } from './AuthLayout';

/**
 * Racine publique. Un visiteur qui arrive sur le domaine principal sans
 * session doit trouver tout de suite comment essayer Gesnotes — pas
 * atterrir directement sur un formulaire de connexion qui suppose déjà un
 * compte.
 */
export default function LandingPage() {
  return (
    <AuthLayout
      title="Bienvenue"
      lead="Notes, présence, bulletins et communication avec les familles — pensé pour être clair dès la première prise en main."
    >
      <div className="auth__form">
        <Link to={paths.signup}>
          <Button block>Essayer Gesnotes dans mon école</Button>
        </Link>
        <Link to={paths.login}>
          <Button variant="secondary" block>Se connecter</Button>
        </Link>
      </div>
    </AuthLayout>
  );
}
