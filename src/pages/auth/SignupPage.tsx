import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { errorMessage, onboardingApi } from '../../api';
import { paths } from '../../routes/paths';
import { Alert, Button, CheckboxChip, TextField, useToast } from '../../ui';
import { AuthLayout } from './AuthLayout';

const NIVEAUX = ['Garderie', 'Maternelle', 'Primaire', 'Collège', 'Secondaire'];

/**
 * Inscription hybride (plan §1) : ce formulaire ne crée ni compte ni mot de
 * passe. Il capte une demande de rappel ; l'équipe Gesnotes configure
 * l'école et son administration au téléphone. La première connexion arrive
 * plus tard, par un lien transmis pendant l'appel.
 */
export default function SignupPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [schoolName, setSchoolName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [levels, setLevels] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleLevel(level: string) {
    setLevels((current) =>
      current.includes(level) ? current.filter((l) => l !== level) : [...current, level],
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onboardingApi.createSignupRequest({
        schoolName: schoolName.trim(),
        contactName: contactName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        city: city.trim(),
        levels,
      });
      // Retour à la landing plutôt qu'un écran de remerciement isolé : la
      // confirmation voyage avec le toast, et le visiteur retombe sur une
      // page qui a une suite (explorer, se connecter) au lieu d'un cul-de-sac.
      toast.success(`Demande envoyée — l’équipe Gesnotes rappelle ${schoolName.trim()} sous 48h.`);
      navigate(paths.landing, { replace: true });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Essayez Gesnotes dans votre école"
      lead="Deux minutes. On vous rappelle."
      linkBrand
      footnote={
        <>
          Vous avez déjà un compte ? <Link to={paths.login}>Connectez-vous</Link>
        </>
      }
    >
      <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <TextField
          label="Nom de l’école"
          name="schoolName"
          required
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
        />

        <TextField
          label="Votre nom"
          name="contactName"
          required
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
        />

        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <TextField
          label="Téléphone"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <TextField
          label="Ville"
          name="city"
          required
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />

        <div className="ui-field">
          <span className="ui-field__label">Niveaux présents</span>
          <div className="flex flex-wrap gap-3">
            {NIVEAUX.map((level) => (
              <CheckboxChip
                key={level}
                label={level}
                checked={levels.includes(level)}
                onChange={() => toggleLevel(level)}
              />
            ))}
          </div>
        </div>

        <Button
          type="submit"
          block
          loading={submitting}
          disabled={
            !schoolName.trim() ||
            !contactName.trim() ||
            !email.trim() ||
            !phone.trim() ||
            !city.trim() ||
            levels.length === 0
          }
        >
          Être rappelé·e
        </Button>
      </form>
    </AuthLayout>
  );
}
