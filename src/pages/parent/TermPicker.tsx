import { useTermContext } from '../../context/term-context';

/** Choix de la période, en pastilles horizontales — plus tactile qu'un select. */
export function TermPicker() {
  const { terms, termId, setTermId } = useTermContext();

  if (terms.length <= 1) return null;

  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--space-2)',
        overflowX: 'auto',
        paddingBottom: 4,
        marginTop: 'calc(var(--space-8) * -1 + var(--space-4))',
      }}
      role="group"
      aria-label="Période scolaire"
    >
      {terms.map((term) => {
        const active = term.id === termId;
        return (
          <button
            key={term.id}
            type="button"
            aria-pressed={active}
            onClick={() => setTermId(term.id)}
            style={{
              padding: '7px 14px',
              borderRadius: 'var(--radius-full)',
              border: `1px solid ${active ? 'var(--primary-container)' : 'var(--outline-variant)'}`,
              background: active ? 'var(--primary-container)' : 'var(--surface-container-lowest)',
              color: active ? 'var(--on-primary)' : 'var(--on-surface-variant)',
              fontSize: 'var(--body-md-size)',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {term.label}
          </button>
        );
      })}
    </div>
  );
}
