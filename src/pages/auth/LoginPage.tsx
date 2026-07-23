import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { errorMessage, isApiError } from '../../api';
import { useAuth } from '../../auth/auth-context';
import { homePathFor, paths } from '../../routes/paths';
import { Alert, Button, TextField } from '../../ui';
import { AuthLayout } from './AuthLayout';

type LocationState = { from?: { pathname: string } };

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const user = await login(identifier.trim(), password);
      const from = (location.state as LocationState | null)?.from?.pathname;
      navigate(from ?? homePathFor(user.role), { replace: true });
    } catch (cause) {
      // Le backend renvoie volontairement un message unique pour tout échec
      // d'authentification : ne pas essayer de distinguer les cas ici.
      setError(
        isApiError(cause) && cause.isUnauthorized
          ? 'Identifiants incorrects. Vérifiez votre email / téléphone et votre mot de passe.'
          : errorMessage(cause),
      );
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
