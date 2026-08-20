import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { errorMessage, staffApi } from '../../api';
import { paths } from '../../routes/paths';
import { Alert, Button, TextField, useToast } from '../../ui';
import { AuthLayout } from '../auth/AuthLayout';

/** Longueur minimale imposée par le backend (`resetBody`). */
const MIN_LENGTH = 8;

export default function StaffResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const toast = useToast();

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const mismatch = confirmation.length > 0 && confirmation !== password;
  const canSubmit = password.length >= MIN_LENGTH && confirmation === password;

  if (!token) {
    return (
      <AuthLayout
        title="Lien invalide"
        lead="Ce lien de réinitialisation est incomplet ou a déjà été utilisé. Demandez-en un nouveau."
      >
        <div className="auth__form">
          <Link to={paths.staff.forgotPassword}>
            <Button block>Demander un nouveau lien</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await staffApi.resetPassword(token, password);
      toast.success('Mot de passe mis à jour. Connectez-vous.');
      navigate(paths.staff.login, { replace: true });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Nouveau mot de passe"
      lead="Choisissez un mot de passe d'au moins 8 caractères. Vos autres sessions seront déconnectées."
    >
      <form className="auth__form" onSubmit={onSubmit} noValidate>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <TextField
          label="Nouveau mot de passe"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={tooShort ? `Au moins ${MIN_LENGTH} caractères.` : undefined}
        />

        <TextField
          label="Confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          error={mismatch ? 'Les deux mots de passe ne correspondent pas.' : undefined}
        />

        <Button type="submit" block loading={submitting} disabled={!canSubmit}>
          Enregistrer
        </Button>
      </form>
    </AuthLayout>
  );
}
