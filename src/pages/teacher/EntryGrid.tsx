
import { useRef, type KeyboardEvent } from 'react';

import type { GradingTableRow } from '../../api';
import { formatCount, plural } from '../../lib/format';
import { Card, Chip, EmptyState, gradeTone } from '../../ui';

export type DraftRow = {
  value: string;
  comment: string;
  /** L'élève a déjà plusieurs notes de ce type : le lot ne peut pas trancher. */
  ambiguous: boolean;
};

type EntryGridProps = {
  rows: GradingTableRow[];
  drafts: Record<number, DraftRow>;
  baseline: Record<number, DraftRow>;
  maxValue: string;
  gradeTypeLabel: string;
  onChange: (studentId: number, patch: Partial<DraftRow>) => void;
};

/**
 * Grille de saisie, une ligne par élève.
 *
 * Pensée pour la frappe au clavier : `Entrée` et les flèches haut/bas passent
 * d'un élève au suivant sans quitter le champ. Une classe se saisit ainsi
 * d'une traite, ce qui est le geste réel — pas trente-quatre clics.
 */
export function EntryGrid({
  rows, drafts, baseline, maxValue, gradeTypeLabel, onChange,
}: EntryGridProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function move(index: number, delta: number) {
    const target = inputs.current[index + delta];
    target?.focus();
    target?.select();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === 'Enter' || event.key === 'ArrowDown') {
      event.preventDefault();
      move(index, 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(index, -1);
    }
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon="⚇"
        title="Aucun élève dans cette classe"
        description="L'administration doit y inscrire des élèves avant toute saisie."
      />
    );
  }

  const max = Number(maxValue);
  const filled = rows.filter((row) => (drafts[row.id]?.value ?? '') !== '').length;

  return (
    <div className="page-stack">
      <p className="t-body-md t-muted">
        {formatCount(rows.length)} {plural(rows.length, 'élève')} · {formatCount(filled)} noté
        {filled > 1 ? 's' : ''} en {gradeTypeLabel.toLowerCase()}
      </p>

      <Card>
        <div className="ui-table-wrap">
          <table className="ui-table entry-grid">
            <caption className="sr-only">
              Grille de saisie des notes, une ligne par élève
            </caption>
            <thead>
              <tr>
                <th style={{ width: 56 }}>#</th>
                <th>Élève</th>
                <th style={{ width: 160 }}>Note / {maxValue}</th>
                <th>Commentaire (visible par la famille)</th>
                <th style={{ width: 130 }}>Autres notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const draft = drafts[row.id] ?? { value: '', comment: '', ambiguous: false };
                const before = baseline[row.id];
                const changed =
                  before && !draft.ambiguous
                    ? draft.value !== before.value || draft.comment !== before.comment
                    : false;

                const parsed = draft.value === '' ? null : Number(draft.value);
                const outOfRange =
                  parsed !== null && (Number.isNaN(parsed) || parsed < 0 || parsed > max);

                const others = row.notes.filter((note) => note.type.id !== undefined);

                return (
                  <tr
                    key={row.id}
                    style={changed ? { background: 'var(--surface-container-low)' } : undefined}
                  >
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--outline)' }}>{index + 1}</span>
                    </td>

                    <td>
                      <span style={{ fontWeight: 600 }}>
                        {row.firstName} {row.lastName}
                      </span>
                      {changed ? (
                        <span
                          className="t-label-sm"
                          style={{ color: 'var(--primary-container)', marginLeft: 8 }}
                        >
                          modifié
                        </span>
                      ) : null}
                    </td>

                    <td>
                      {draft.ambiguous ? (
                        <span className="t-label-sm t-subtle" style={{ textTransform: 'none' }}>
                          Plusieurs notes de ce type — à corriger dans l'historique
                        </span>
                      ) : (
                        <input
                          ref={(element) => {
                            inputs.current[index] = element;
                          }}
                          className="ui-input"
                          style={{ width: 110 }}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={max}
                          step={0.25}
                          placeholder="—"
                          aria-invalid={outOfRange}
                          aria-label={`Note de ${row.firstName} ${row.lastName}`}
                          value={draft.value}
                          onChange={(e) => onChange(row.id, { value: e.target.value })}
                          onKeyDown={(e) => onKeyDown(e, index)}
                        />
                      )}
                    </td>

                    <td>
                      <input
                        className="ui-input"
                        type="text"
                        maxLength={2000}
                        placeholder="Facultatif"
                        aria-label={`Commentaire pour ${row.firstName} ${row.lastName}`}
                        disabled={draft.ambiguous}
                        value={draft.comment}
                        onChange={(e) => onChange(row.id, { comment: e.target.value })}
                      />
                    </td>

                    <td>
                      {others.length === 0 ? (
                        <span className="t-subtle">—</span>
                      ) : (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {others.map((note) => (
                            <Chip key={note.id} tone={gradeTone(note.value, note.maxValue)}>
                              {note.value}
                            </Chip>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="t-label-sm t-subtle" style={{ textTransform: 'none' }}>
        Astuce : <kbd>Entrée</kbd> ou <kbd>↓</kbd> passe à l'élève suivant. Videz une case pour
        supprimer la note correspondante.
      </p>
    </div>
  );
}
