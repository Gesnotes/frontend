import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { paths } from '../../routes/paths';
import { BrandMark, Card } from '../../ui';

export function AuthLayout({
  title, lead, children, footnote, linkBrand = false,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
  footnote?: ReactNode;
  /** Vrai sur les écrans publics (connexion, inscription, mot de passe) : le
   * logo redevient une porte de sortie vers la landing. Faux par défaut, en
   * particulier pour l'espace équipe qui n'a pas vocation à renvoyer un
   * membre de l'équipe vers la page marketing publique. */
  linkBrand?: boolean;
}) {
  const brandContent = (
    <>
      <BrandMark size={56} />
      <p className="text-2xl font-bold text-gray-900">Gesnotes</p>
      <p className="text-sm text-gray-500">Le suivi scolaire, en toute confiance</p>
    </>
  );

  return (
    <main className="flex min-h-full items-center justify-center bg-[#F6F7FB] px-4 py-6 sm:px-6">
      <div className="w-full max-w-md">
        <header className="mb-6 flex flex-col items-center gap-2 text-center">
          {linkBrand ? (
            <Link
              to={paths.landing}
              className="flex flex-col items-center gap-2 transition-opacity hover:opacity-80"
              aria-label="Retour à l'accueil Gesnotes"
            >
              {brandContent}
            </Link>
          ) : (
            brandContent
          )}
        </header>

        <Card padded>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          {lead ? <p className="mt-1 text-sm text-gray-500">{lead}</p> : null}
          {children}
          {footnote ? (
            <div className="mt-5 border-t border-gray-100 pt-4 text-center text-xs text-gray-400">{footnote}</div>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
