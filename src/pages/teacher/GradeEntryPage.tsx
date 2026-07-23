import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  errorMessage, gradesApi, referentialsApi,
  type Grade, type GradeType, type GradingTableRow, type ID,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useTermContext } from '../../context/term-context';
import { formatCount, plural } from '../../lib/format';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import { TermSelect } from '../../layouts/TermSelect';
import {
  Alert, Button, Card, Chip, ConfirmDialog, DataTable, EmptyState, Skeleton,
  gradeTone, useToast, type Column,
} from '../../ui';
import { TermRequired } from '../admin/TermRequired';
import { GradeEditModal } from './GradeEditModal';

export default function GradeEntryPage() {
  const [params, setParams] = useSearchParams();
  const { termId, term } = useTermContext();
  const toast = useToast();

  const assignments = gradesApi.useMyClasses(termId);
  const gradeTypes = referentialsApi.useGradeTypes();

  const classId = params.get('classe') ? Number(params.get('classe')) : undefined;
  const subjectId = params.get('matiere') ? Number(params.get('matiere')) : undefined;

  const selected = assignments.data?.find(
    (a) => a.classId === classId && a.subjectId === subjectId,
  );

  const table = gradesApi.useGradingTable(classId, subjectId, termId);

  const [gradeTypeId, setGradeTypeId] = useState<ID | undefined>(undefined);
  const [maxValue, setMaxValue] = useState('20');
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Grade | null>(null);
  const [toDelete, setToDelete] = useState<Grade | null>(null);

  const createGrade = gradesApi.useCreateGrade();
  const deleteGrade = gradesApi.useDeleteGrade();

  // Le type par défaut est le premier de la liste (interrogation), le plus
  // fréquent en cours de trimestre.
  const activeGradeTypeId = gradeTypeId ?? gradeTypes.data?.[0]?.id;
  const activeGradeType = gradeTypes.data?.find((t) => t.id === activeGradeTypeId);

  const filled = useMemo(
    () => Object.entries(drafts).filter(([, value]) => value.trim() !== ''),
    [drafts],
  );

  function selectAssignment(value: string) {
    const [nextClass, nextSubject] = value.split(':');
    setParams({ classe: nextClass, matiere: nextSubject });
    setDrafts({});
  }

  /**
   * Enregistrement des notes saisies.
   *
   * Il n'existe pas d'endpoint de création en lot : chaque note part dans sa
   * propre requête. Les échecs sont donc partiels par nature — on les compte
   * et on conserve les brouillons concernés, plutôt que de tout effacer en
   * laissant croire que la saisie est passée.
   */
  async function saveDrafts() {
    if (!classId || !subjectId || !termId || !activeGradeTypeId) return;

    const max = Number(maxValue);
    const invalid = filled.filter(([, value]) => {
      const parsed = Number(value);
      return Number.isNaN(parsed) || parsed < 0 || parsed > max;
    });
    if (invalid.length > 0) {
      toast.error(`${invalid.length} note(s) hors barème (0 à ${max}).`);
      return;
    }

    setSaving(true);
    const failures: Record<number, string> = {};
    let duplicates = 0;

    for (const [studentId, value] of filled) {
      try {
        const result = await createGrade.mutateAsync({
          studentId: Number(studentId) as ID,
          subjectId,
          gradeTypeId: activeGradeTypeId,
          termId,
          value: Number(value),
          maxValue: max,
        });
        if (result.avertissementDoublon) duplicates += 1;
      } catch (cause) {
        failures[Number(studentId)] = value;
        if (Object.keys(failures).length === 1) toast.error(errorMessage(cause));
      }
    }

    setDrafts(failures);
    setSaving(false);

    const saved = filled.length - Object.keys(failures).length;
    if (saved > 0) {
      toast.success(`${saved} ${plural(saved, 'note')} enregistrée${saved > 1 ? 's' : ''}`);
    }
    if (duplicates > 0) {
      toast.info(
        `${duplicates} élève(s) avaient déjà une note de ce type sur cette période.`,
      );
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await deleteGrade.mutateAsync(toDelete.id);
      toast.success('Note supprimée');
      setToDelete(null);
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  return (
    <>
      <PageHeader
        title="Saisie des notes"
        subtitle={
          selected
            ? `${selected.subjectName} · ${selected.className} · ${term?.label ?? ''}`
            : 'Choisissez une classe et une matière'
        }
        actions={<TermSelect />}
      />
      <PageContent>
        <TermRequired>
          <div className="page-stack">
            <QueryBoundary query={assignments} loading={<Skeleton height={52} />}>
              {(items) =>
                items.length === 0 ? (
                  <EmptyState
                    icon="✎"
                    title="Aucune classe affectée"
                    description="Sans affectation classe × matière, la saisie de notes n'est pas autorisée."
                  />
                ) : (
                  <div className="page-toolbar">
                    <label className="ui-field" style={{ minWidth: 280 }}>
                      <span className="ui-field__label">Classe et matière</span>
                      <select
                        className="ui-select"
                        value={selected ? `${selected.classId}:${selected.subjectId}` : ''}
                        onChange={(e) => selectAssignment(e.target.value)}
                      >
                        <option value="" disabled>— Choisir —</option>
                        {items.map((item) => (
                          <option
                            key={item.assignmentId}
                            value={`${item.classId}:${item.subjectId}`}
                          >
                            {item.className} · {item.subjectName}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="ui-field" style={{ minWidth: 200 }}>
                      <span className="ui-field__label">Type de note</span>
                      <select
                        className="ui-select"
                        value={activeGradeTypeId ?? ''}
                        onChange={(e) => setGradeTypeId(Number(e.target.value))}
                      >
                        {(gradeTypes.data ?? []).map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.label} (coef. {type.weight})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="ui-field" style={{ maxWidth: 120 }}>
                      <span className="ui-field__label">Barème</span>
                      <input
                        className="ui-input"
                        type="number"
                        min={1}
                        step={1}
                        value={maxValue}
                        onChange={(e) => setMaxValue(e.target.value)}
                      />
                    </label>

                    <div className="page-toolbar__end">
                      <Button
                        loading={saving}
                        disabled={filled.length === 0 || !selected}
                        onClick={() => void saveDrafts()}
                      >
                        Enregistrer {filled.length > 0 ? `(${filled.length})` : ''}
                      </Button>
                    </div>
                  </div>
                )
              }
            </QueryBoundary>

            {gradeTypes.isError ? (
              <Alert tone="danger">
                Impossible de charger les types de note. La saisie est indisponible.
              </Alert>
            ) : null}

            {!selected ? (
              <EmptyState
                icon="◫"
                title="Aucune classe sélectionnée"
                description="Choisissez une classe et une matière ci-dessus pour afficher la liste des élèves."
              />
            ) : (
              <QueryBoundary query={table} loading={<TableSkeleton />}>
                {(rows) => (
                  <EntryTable
                    rows={rows}
                    gradeTypes={gradeTypes.data ?? []}
                    activeGradeType={activeGradeType}
                    maxValue={maxValue}
                    drafts={drafts}
                    onDraftChange={(studentId, value) =>
                      setDrafts((current) => ({ ...current, [studentId]: value }))
                    }
                    onEdit={setEditing}
                    onDelete={setToDelete}
                  />
                )}
              </QueryBoundary>
            )}
          </div>
        </TermRequired>
      </PageContent>

      <GradeEditModal
        key={editing?.id ?? 'none'}
        grade={editing}
        gradeTypes={gradeTypes.data ?? []}
        subtitle={selected ? `${selected.subjectName} · ${selected.className}` : undefined}
        onClose={() => setEditing(null)}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cette note ?"
        description="La note est retirée du bulletin de l'élève et sa moyenne est recalculée. Cette action est irréversible."
        confirmLabel="Supprimer"
        loading={deleteGrade.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}

function EntryTable({
  rows, activeGradeType, maxValue, drafts, onDraftChange, onEdit, onDelete,
}: {
  rows: GradingTableRow[];
  gradeTypes: GradeType[];
  activeGradeType: GradeType | undefined;
  maxValue: string;
  drafts: Record<number, string>;
  onDraftChange: (studentId: number, value: string) => void;
  onEdit: (grade: Grade) => void;
  onDelete: (grade: Grade) => void;
}) {
  const columns: Column<GradingTableRow>[] = [
    {
      key: 'index',
      header: '#',
      width: 56,
      render: (_row, index) => (
        <span style={{ fontWeight: 700, color: 'var(--outline)' }}>{index + 1}</span>
      ),
    },
    {
      key: 'student',
      header: 'Élève',
      render: (row) => (
        <span style={{ fontWeight: 600 }}>
          {row.firstName} {row.lastName}
        </span>
      ),
    },
    {
      key: 'existing',
      header: 'Notes déjà saisies',
      render: (row) =>
        row.notes.length === 0 ? (
          <span className="t-subtle">Aucune</span>
        ) : (
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {row.notes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => onEdit(note)}
                title={`${note.type.label} — modifier`}
                style={{ border: 'none', background: 'none', padding: 0 }}
              >
                <Chip tone={gradeTone(note.value, note.maxValue)}>
                  {note.value} / {note.maxValue} · {note.type.label}
                </Chip>
              </button>
            ))}
          </div>
        ),
    },
    {
      key: 'draft',
      header: activeGradeType ? `Nouvelle note (${activeGradeType.label})` : 'Nouvelle note',
      width: 200,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <input
            className="ui-input"
            style={{ width: 90 }}
            type="number"
            min={0}
            max={Number(maxValue)}
            step={0.25}
            placeholder="—"
            aria-label={`Note de ${row.firstName} ${row.lastName}`}
            value={drafts[row.id] ?? ''}
            onChange={(e) => onDraftChange(row.id, e.target.value)}
          />
          <span className="t-subtle">/ {maxValue}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'numeric',
      render: (row) =>
        row.notes.length === 0 ? null : (
          <div className="cell-actions">
            <Button
              size="sm"
              variant="danger"
              onClick={() => onDelete(row.notes[row.notes.length - 1])}
            >
              Supprimer la dernière
            </Button>
          </div>
        ),
    },
  ];

  const withoutGrade = rows.filter((row) => row.notes.length === 0).length;

  return (
    <div className="page-stack">
      <p className="t-body-md t-muted">
        {formatCount(rows.length)} {plural(rows.length, 'élève')} ·{' '}
        {withoutGrade === 0
          ? 'tous ont au moins une note'
          : `${formatCount(withoutGrade)} sans aucune note`}
      </p>

      <DataTable
        caption="Grille de saisie"
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        empty={
          <EmptyState
            icon="⚇"
            title="Aucun élève dans cette classe"
            description="L'administration doit y inscrire des élèves avant toute saisie."
          />
        }
      />
    </div>
  );
}

function TableSkeleton() {
  return (
    <Card padded>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} height={44} style={{ marginBottom: 12 }} />
      ))}
    </Card>
  );
}
