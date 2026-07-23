import type { ReactNode } from 'react';

/**
 * En-tête de page, collant en haut du contenu.
 *
 * `back` et `actions` sont facultatifs : une page de liste n'a pas de retour,
 * une page de détail n'a pas toujours d'action principale.
 */
export function PageHeader({
  title, subtitle, actions, back,
}: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <header className="shell__header">
      {back}
      <div className="shell__header-titles">
        <h1 className="shell__header-title">{title}</h1>
        {subtitle ? <p className="shell__header-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="shell__header-actions">{actions}</div> : null}
    </header>
  );
}

export function PageContent({ children }: { children: ReactNode }) {
  return <div className="shell__content">{children}</div>;
}
