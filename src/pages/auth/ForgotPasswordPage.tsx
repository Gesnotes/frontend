import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { authApi, errorMessage } from '../../api';
import { paths } from '../../routes/paths';
import { Alert, Button, TextField } from '../../ui';
import { AuthLayout } from './AuthLayout';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout
        title="Vérifiez votre boîte de réception"
        lead={`Si un compte est associé à ${email}, un lien de réinitialisation vient d'être envoyé. Il expire dans une heure.`}
      >
        <div className="auth__form">
          <Link to={paths.login}>
            <Button variant="secondary" block>Retour à la connexion</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Mot de passe oublié"
      lead="Saisissez l'adresse email associée à votre compte. Nous vous enverrons un lien de réinitialisation."
    >
      <form className="auth__form" onSubmit={onSubmit} noValidate>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <TextField
          label="Adresse email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Button type="submit" block loading={submitting} disabled={!email}>
          Envoyer le lien
        </Button>

        <Link to={paths.login}>
          <Button variant="secondary" block type="button">Retour à la connexion</Button>
        </Link>
      </form>
    </AuthLayout>
  );
}
