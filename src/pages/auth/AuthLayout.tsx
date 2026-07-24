import type { ReactNode } from 'react';

import { BrandMark, Card } from '../../ui';

export function AuthLayout({
  title, lead, children, footnote,
}: { title: string; lead?: string; children: ReactNode; footnote?: ReactNode }) {
  return (
    <main className="auth">
      <div className="auth__panel">
        <header className="auth__brand">
          <BrandMark size={56} />
          <p className="auth__brand-name">Gesnotes</p>
          <p className="t-body-md t-muted">Le suivi scolaire, en toute confiance</p>
        </header>

        <Card className="auth__card">
          <h1 className="auth__title">{title}</h1>
          {lead ? <p className="auth__lead">{lead}</p> : null}
          {children}
          {footnote ? <div className="auth__footnote">{footnote}</div> : null}
        </Card>
      </div>
    </main>
  );
}
