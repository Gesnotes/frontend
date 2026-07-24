import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { errorMessage, isApiError } from '../../api';
import { useAuth } from '../../auth/auth-context';
import { homePathFor, paths } from '../../routes/paths';
import { Alert, Button, TextField } from '../../ui';
import { AuthLayout } from './AuthLayout';

type LocationState = { from?: { pathname: string } };

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
    return 'Identifiants incorrects. Vérifiez votre email / téléphone et votre mot de passe.';
  }
  return errorMessage(cause);
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hint, setHint] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setHint(false);
    setSubmitting(true);

    try {
      const user = await login(identifier.trim(), password);
      const from = (location.state as LocationState | null)?.from?.pathname;
      navigate(from ?? homePathFor(user.role), { replace: true });
    } catch (cause) {
      setError(loginErrorMessage(cause));
      // En développement seulement : le backend trace dans ses logs si le
      // compte existe dans une autre école, cause la plus fréquente d'un
      // échec avec des identifiants pourtant corrects.
      setHint(import.meta.env.DEV && isApiError(cause) && cause.isUnauthorized);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Connexion"
      lead="Accédez à votre espace"
      footnote="Votre établissement vous a transmis vos identifiants par email."
    >
      <form className="auth__form" onSubmit={onSubmit} noValidate>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        {hint ? (
          <Alert tone="info">
            En développement : si ces identifiants sont bons, le compte appartient peut-être à une
            autre école. Le terminal du backend indique laquelle.
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

        <div className="auth__row-end">
          <Link to={paths.forgotPassword}>Mot de passe oublié ?</Link>
        </div>

        <Button type="submit" block loading={submitting} disabled={!identifier || !password}>
          Se connecter
        </Button>
      </form>
    </AuthLayout>
  );
}
