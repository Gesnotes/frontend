import { BrandMark } from './ui';

/** Écran d'attente — remplacé par le routeur applicatif dans la suite du chantier. */
export default function App() {
  return (
    <main
      style={{
        minHeight: '100%',
        display: 'grid',
        placeContent: 'center',
        justifyItems: 'center',
        gap: 'var(--space-3)',
      }}
    >
      <BrandMark size={56} />
      <h1 className="t-headline-lg">Gesnotes</h1>
      <p className="t-body-md t-muted">Le suivi scolaire, en toute confiance</p>
    </main>
  );
}
