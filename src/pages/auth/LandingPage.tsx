import { Link, useNavigate } from 'react-router-dom';

import {
  DEMO_IDENTIFIER, DEMO_PASSWORD, DEMO_SCHOOL_NAME, DEMO_SUBDOMAIN, schoolSelectionStore,
} from '../../api';
import { paths } from '../../routes/paths';
import { Button } from '../../ui';
import { AuthLayout } from './AuthLayout';

const HAS_DEMO = Boolean(DEMO_SUBDOMAIN && DEMO_IDENTIFIER && DEMO_PASSWORD);

/**
 * Racine publique. Un visiteur qui arrive sur le domaine principal sans
 * session doit trouver tout de suite comment essayer Gesnotes — pas
 * atterrir directement sur un formulaire de connexion qui suppose déjà un
 * compte.
 */
export default function LandingPage() {
  const navigate = useNavigate();

  /**
   * Choisit l'école de démonstration comme le ferait un visiteur depuis
   * « Quelle est votre école ? », puis pré-remplit la connexion — sans la
   * soumettre à sa place, la dernière étape reste un geste volontaire.
   */
  function openDemo() {
    schoolSelectionStore.set({ subdomain: DEMO_SUBDOMAIN, name: DEMO_SCHOOL_NAME, city: null });
    navigate(paths.login, {
      state: { demoIdentifier: DEMO_IDENTIFIER, demoPassword: DEMO_PASSWORD },
    });
  }

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
        {HAS_DEMO ? (
          <Button variant="ghost" block onClick={openDemo} type="button">
            Voir une démo
          </Button>
        ) : null}
      </div>
    </AuthLayout>
  );
}
