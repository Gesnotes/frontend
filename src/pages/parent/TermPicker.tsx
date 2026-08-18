import { useTermContext } from '../../context/term-context';

/** Choix de la période, en pastilles horizontales — plus tactile qu'un select. */
export function TermPicker() {
  const { terms, termId, setTermId } = useTermContext();

  if (terms.length <= 1) return null;

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Période scolaire">
      {terms.map((term) => {
        const active = term.id === termId;
        return (
          <button
            key={term.id}
            type="button"
            aria-pressed={active}
            onClick={() => setTermId(term.id)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              active ? 'bg-[#173bab] text-white' : 'border border-gray-200 bg-white text-gray-600'
            }`}
          >
            {term.label}
          </button>
        );
      })}
    </div>
  );
}
