import { useTermContext } from '../context/term-context';
import { Skeleton } from '../ui';

/** Sélecteur de période de l'en-tête, piloté par `TermProvider`. */
export function TermSelect() {
  const { terms, termId, setTermId, isLoading, isError } = useTermContext();

  if (isLoading) return <Skeleton width={160} height={42} radius="var(--radius)" />;
  if (isError || terms.length === 0) return null;

  return (
    <label className="ui-field" style={{ minWidth: 180 }}>
      <span className="sr-only">Période scolaire</span>
      <select
        className="ui-select"
        value={termId ?? ''}
        onChange={(event) => setTermId(Number(event.target.value))}
      >
        {terms.map((term) => (
          <option key={term.id} value={term.id}>
            {term.label}
            {term.isCurrent ? ' · en cours' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
