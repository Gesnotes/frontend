import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { errorMessage, isApiError, type IdentifyResult } from '../../api';
import { useAuth } from '../../auth/auth-context';
import { homePathFor, paths } from '../../routes/paths';
import { Alert, Button, TextField } from '../../ui';
import { AuthLayout } from './AuthLayout';

type LocationState = {
  from?: { pathname: string };
  /** Posés par la vitrine (« Voir une démo ») : préremplissent sans soumettre. */
  demoIdentifier?: string;
  demoPassword?: string;
};

type AmbiguousSchool = Extract<IdentifyResult, { status: 'ambiguous' }>['schools'][number];

/**
 * Message d'échec de connexion.
 *
 * Le backend renvoie volontairement la même erreur pour « compte inconnu »,
 * « mot de passe faux » et « compte archivé » : la distinction permettrait
 * d'énumérer les comptes. On n'essaie donc pas d'en dire plus — sauf pour les
 * erreurs qui ne viennent pas de l'authentification, dont le message du
 * serveur est utile tel quel (école introuvable, serveur injoignable).
 */
function loginErrorMessage(cause: unknown): string {
  if (isApiError(cause) && cause.isUnauthorized) {
    return 'Email, téléphone ou mot de passe incorrect. Vérifiez votre saisie, puis réessayez.';
  }
  return errorMessage(cause);
}

export default function LoginPage() {
  const { identify } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [identifier, setIdentifier] = useState(state?.demoIdentifier ?? '');
  const [password, setPassword] = useState(state?.demoPassword ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /**
   * Identifiant et mot de passe valables dans plusieurs écoles à la fois (un
   * parent avec un enfant dans chacune, par exemple) : impossible de deviner
   * laquelle, il faut la faire choisir.
   */
  const [schools, setSchools] = useState<AmbiguousSchool[] | null>(null);

  function goHome(role: Parameters<typeof homePathFor>[0]) {
    navigate(state?.from?.pathname ?? homePathFor(role), { replace: true });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await identify(identifier.trim(), password);
      if (result.status === 'ambiguous') {
        setSchools(result.schools);
        return;
      }
      goHome(result.user.role);
    } catch (cause) {
      setError(loginErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  /** École choisie dans la liste ambiguë : termine la connexion sur celle-ci. */
  async function chooseSchool(school: AmbiguousSchool) {
    setError(null);
    setSubmitting(true);
    try {
      const result = await identify(identifier.trim(), password, school.id);
      if (result.status === 'ambiguous') {
        // Ne devrait pas arriver : un schoolId choisi dans la liste
        // précédente referme toujours le choix côté serveur.
        setSchools(result.schools);
        return;
      }
      goHome(result.user.role);
    } catch (cause) {
      setError(loginErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  if (schools) {
    return (
      <AuthLayout
        title="Quelle est votre école ?"
        lead="Ces identifiants correspondent à plusieurs établissements. Choisissez le vôtre."
        linkBrand
      >
        <div className="mt-6 flex flex-col gap-4">
          {error ? <Alert tone="danger">{error}</Alert> : null}

          <div className="list-rows">
            {schools.map((school) => (
              <div key={school.id} className="list-row">
                <div className="list-row__body">
                  <div className="list-row__title">{school.name}</div>
                  {school.city ? <div className="list-row__meta">{school.city}</div> : null}
                </div>
                <Button size="sm" variant="tonal" loading={submitting} onClick={() => chooseSchool(school)}>
                  Choisir
                </Button>
              </div>
            ))}
          </div>

          <Button variant="secondary" block type="button" onClick={() => setSchools(null)}>
            Revenir
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Connexion"
      lead="Accédez à votre espace"
      footnote="Votre établissement vous a transmis vos identifiants par email."
      linkBrand
    >
      <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        {state?.demoIdentifier ? (
          <Alert tone="info">
            Identifiants de démonstration déjà renseignés — il ne reste qu'à vous connecter.
          </Alert>
        ) : null}

        <TextField
          label="Email ou téléphone"
          name="identifier"
          autoComplete="username"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />

        <TextField
          label="Mot de passe"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex justify-end text-sm">
          <Link to={paths.forgotPassword} className="font-semibold text-primary hover:underline">Mot de passe oublié ?</Link>
        </div>

        <Button type="submit" block loading={submitting} disabled={!identifier || !password}>
          Se connecter
        </Button>
      </form>
    </AuthLayout>
  );
}
