import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { onboardingApi, schoolSelectionStore, type SchoolSearchResult } from '../../api';
import { paths } from '../../routes/paths';
import { Button, TextField } from '../../ui';
import { AuthLayout } from './AuthLayout';

/**
 * Connexion sans sous-domaine (plan §1.2 bis).
 *
 * Ne s'affiche que sur le domaine principal, quand aucune école n'a encore
 * été choisie sur cet appareil — voir la redirection dans `LoginPage`. Le
 * choix fait ici est mémorisé : cette recherche ne sert qu'une fois par
 * appareil, un lien d'invitation résolvant déjà l'école pour tous les autres.
 */
export default function SchoolPickerPage() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const search = onboardingApi.useSchoolSearch(query);

  function choose(school: SchoolSearchResult) {
    schoolSelectionStore.set({ subdomain: school.subdomain, name: school.name, city: school.city });
    navigate(paths.login, { replace: true });
  }

  const trimmed = query.trim();
  const showEmpty = search.data && search.data.length === 0 && trimmed.length >= 2;

  return (
    <AuthLayout
      title="Quelle est votre école ?"
      lead="Tapez son nom ou sa ville."
      footnote={
        <>
          Votre école n’utilise pas encore Gesnotes ?{' '}
          <Link to={paths.signup}>Inscrivez-la</Link>
        </>
      }
    >
      <div className="auth__form">
        <TextField
          label="Nom de l’école ou de la ville"
          name="q"
          hint="Au moins deux caractères."
          autoFocus
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {search.data && search.data.length > 0 ? (
          <div className="list-rows">
            {search.data.map((school) => (
              <div key={school.id} className="list-row">
                <div className="list-row__body">
                  <div className="list-row__title">{school.name}</div>
                  {school.city ? <div className="list-row__meta">{school.city}</div> : null}
                </div>
                <Button size="sm" variant="tonal" onClick={() => choose(school)}>
                  Choisir
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        {showEmpty ? (
          <p className="t-body-md t-muted">
            Aucune école ne correspond. Vérifiez l’orthographe, ou inscrivez votre école ci-dessous.
          </p>
        ) : null}

        <p className="t-label-sm t-subtle" style={{ textTransform: 'none' }}>
          Le lien reçu de votre école ouvre directement l’étape suivante — cette recherche ne sert
          qu’une fois par appareil.
        </p>
      </div>
    </AuthLayout>
  );
}
