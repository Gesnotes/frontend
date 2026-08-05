import { useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/auth-context';
import { homePathFor, paths } from '../routes/paths';
import { EmptyState } from '../ui';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { role } = useAuth();

  return (
    <main className="auth">
      <EmptyState
        icon="?"
        title="Page introuvable"
        titleAs="h1"
        description="Ce lien n'existe pas ou n'est plus accessible."
        action={{
          label: 'Retour à l’accueil',
          onClick: () => navigate(role ? homePathFor(role) : paths.login, { replace: true }),
        }}
      />
    </main>
  );
}
