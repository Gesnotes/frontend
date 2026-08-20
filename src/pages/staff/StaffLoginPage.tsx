import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { errorMessage, isApiError } from '../../api';
import { useStaffAuth } from '../../staff/staff-auth-context';
import { paths } from '../../routes/paths';
import { Alert, Button, TextField } from '../../ui';
import { AuthLayout } from '../auth/AuthLayout';

type LocationState = { from?: { pathname: string } };

export default function StaffLoginPage() {
  const { login } = useStaffAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      const from = (location.state as LocationState | null)?.from?.pathname;
      navigate(from ?? paths.staff.root, { replace: true });
    } catch (cause) {
      const message = isApiError(cause) && cause.isUnauthorized
        ? 'Email ou mot de passe incorrect. Vérifiez votre saisie, puis réessayez.'
        : errorMessage(cause);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Équipe Gesnotes" lead="Connexion réservée à l'équipe.">
      <form className="auth__form" onSubmit={onSubmit} noValidate>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          <Link to={paths.staff.forgotPassword}>Mot de passe oublié ?</Link>
        </div>

        <Button type="submit" block loading={submitting} disabled={!email || !password}>
          Se connecter
        </Button>
      </form>
    </AuthLayout>
  );
}
