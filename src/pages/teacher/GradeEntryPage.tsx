import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  errorMessage, gradesApi, isApiError, referentialsApi,
  type GradeBatchEntry, type GradeBatchPayload, type GradeBatchResult,
  type GradingTableRow, type ID,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useTermContext } from '../../context/term-context';
import { usePendingBatches } from '../../hooks/usePendingBatches';
import { offlineQueue } from '../../lib/offlineQueue';
import { formatCount, plural } from '../../lib/format';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import { TermSelect } from '../../layouts/TermSelect';
import { Alert, Button, Card, EmptyState, Skeleton, useToast } from '../../ui';
import { TermRequired } from '../admin/TermRequired';
import { EntryGrid, type DraftRow } from './EntryGrid';
import { PendingBatchesBanner } from './PendingBatchesBanner';

const blankDraft: DraftRow = { value: '', comment: '', ambiguous: false };

/** Valeur affichée pour un élève : sa note existante du type sélectionné. */
function initialDrafts(rows: GradingTableRow[], gradeTypeId: ID | undefined): Record<number, DraftRow> {
  const drafts: Record<number, DraftRow> = {};
  for (const row of rows) {
    const matching = row.notes.filter((note) => note.type.id === gradeTypeId);
    const single = matching.length === 1 ? matching[0] : undefined;
    drafts[row.id] = {
      value: single ? String(single.value) : '',
      comment: single?.comment ?? '',
      // Plusieurs notes du même type : le backend refuse de choisir, la
      // ligne est affichée en lecture seule.
      ambiguous: matching.length > 1,
    };
  }
  return drafts;
}

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
  const saveBatch = gradesApi.useSaveGradeBatch();

  const [gradeTypeId, setGradeTypeId] = useState<ID | undefined>(undefined);
  const [maxValue, setMaxValue] = useState('20');

  const activeGradeTypeId = gradeTypeId ?? gradeTypes.data?.[0]?.id;
  const activeGradeType = gradeTypes.data?.find((t) => t.id === activeGradeTypeId);

  /** État serveur : ce que valent les notes avant toute frappe. */
  const baseline = useMemo(
    () => initialDrafts(table.data ?? [], activeGradeTypeId),
    [table.data, activeGradeTypeId],
  );

  /**
   * Seules les lignes touchées sont mémorisées, et non la grille entière.
   *
   * Un rafraîchissement de fond ne doit pas écraser une saisie en cours :
   * l'affichage est recalculé à partir de l'état serveur le plus récent,
   * recouvert des modifications de l'enseignant.
   */
  const [edits, setEdits] = useState<Record<number, DraftRow>>({});

  // Changer de classe, de matière ou d'évaluation repart d'une grille vierge.
  // Ajustement pendant le rendu plutôt que dans un effet, pour éviter un
  // rendu intermédiaire affichant les brouillons de l'écran précédent.
  const contextKey = `${classId}:${subjectId}:${termId}:${activeGradeTypeId}`;
  const [seenKey, setSeenKey] = useState(contextKey);
  if (seenKey !== contextKey) {
    setSeenKey(contextKey);
    setEdits({});
  }

  const drafts = useMemo(() => ({ ...baseline, ...edits }), [baseline, edits]);

  const onFlushed = useCallback(
    (report: { sent: number; dropped: { label: string; reason: string }[] }) => {
      if (report.sent > 0) {
        toast.success(
          `${report.sent} ${plural(report.sent, 'saisie')} en attente ${report.sent > 1 ? 'ont' : 'a'} été enregistrée${report.sent > 1 ? 's' : ''}`,
        );
      }
      for (const dropped of report.dropped) {
        toast.error(`« ${dropped.label} » abandonnée : ${dropped.reason}`);
      }
    },
    [toast],
  );

  const { pending, isOnline, flush, discard } = usePendingBatches(onFlushed);

  /** Lignes réellement changées : ce sont les seules envoyées au serveur. */
  const dirty = useMemo(
    () =>
      Object.entries(edits).filter(([studentId, draft]) => {
        const before = baseline[Number(studentId)];
        if (!before || before.ambiguous) return false;
        return draft.value !== before.value || draft.comment !== before.comment;
      }),
    [edits, baseline],
  );

  const invalid = useMemo(() => {
    const max = Number(maxValue);
    return dirty.filter(([, draft]) => {
      if (draft.value === '') return false;
      const parsed = Number(draft.value);
      return Number.isNaN(parsed) || parsed < 0 || parsed > max;
    });
  }, [dirty, maxValue]);

  const pendingForThis = pending.find(
    (item) =>
      item.payload.classId === classId &&
      item.payload.subjectId === subjectId &&
      item.payload.gradeTypeId === activeGradeTypeId &&
      item.payload.termId === termId,
  );

  function selectAssignment(value: string) {
    const [nextClass, nextSubject] = value.split(':');
    setParams({ classe: nextClass ?? '', matiere: nextSubject ?? '' });
  }

  function buildPayload(): GradeBatchPayload | null {
    if (!classId || !subjectId || !termId || !activeGradeTypeId) return null;

    const entries: GradeBatchEntry[] = dirty.map(([studentId, draft]) => ({
      studentId: Number(studentId) as ID,
      value: draft.value === '' ? null : Number(draft.value),
      comment: draft.comment.trim() || null,
    }));

    return {
      classId,
      subjectId,
      gradeTypeId: activeGradeTypeId,
      termId,
      maxValue: Number(maxValue),
      entries,
    };
  }

  async function save() {
    const payload = buildPayload();
    if (!payload || payload.entries.length === 0) return;

    const label = `${selected?.subjectName ?? ''} · ${selected?.className ?? ''} · ${activeGradeType?.label ?? ''}`;

    // Hors connexion, on ne tente même pas : le lot part en file d'attente et
    // sera rejoué au retour du réseau. Le PUT étant idempotent, un rejeu ne
    // peut pas dupliquer les notes.
    if (!isOnline) {
      offlineQueue.enqueue(payload, label);
      setEdits({});
      toast.info(`Hors connexion — ${payload.entries.length} ${plural(payload.entries.length, 'note')} mise${payload.entries.length > 1 ? 's' : ''} en attente`);
      return;
    }

    try {
      const result = await saveBatch.mutateAsync(payload);
      setEdits({});
      announce(result, toast);
    } catch (error) {
      // Panne réseau : la saisie est conservée plutôt que perdue.
      if (!isApiError(error) || error.status === 0) {
        offlineQueue.enqueue(payload, label);
        setEdits({});
        toast.info('Serveur injoignable — la saisie est conservée et sera envoyée au retour du réseau');
        return;
      }
      toast.error(errorMessage(error));
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
            <PendingBatchesBanner
              pending={pending}
              isOnline={isOnline}
              onRetry={() => void flush()}
              onDiscard={discard}
            />

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
                    <label className="ui-field" style={{ minWidth: 260 }}>
                      <span className="ui-field__label">Classe et matière</span>
                      <select
                        className="ui-select"
                        value={selected ? `${selected.classId}:${selected.subjectId}` : ''}
                        onChange={(e) => selectAssignment(e.target.value)}
                      >
                        <option value="" disabled>— Choisir —</option>
                        {items.map((item) => (
                          <option key={item.assignmentId} value={`${item.classId}:${item.subjectId}`}>
                            {item.className} · {item.subjectName}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="ui-field" style={{ minWidth: 200 }}>
                      <span className="ui-field__label">Évaluation</span>
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

                    <label className="ui-field" style={{ maxWidth: 110 }}>
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
                        loading={saveBatch.isPending}
                        disabled={dirty.length === 0 || invalid.length > 0 || !selected}
                        onClick={() => void save()}
                      >
                        {isOnline ? 'Enregistrer' : 'Mettre en attente'}
                        {dirty.length > 0 ? ` (${dirty.length})` : ''}
                      </Button>
                    </div>
                  </div>
                )
              }
            </QueryBoundary>

            {gradeTypes.isError ? (
              <Alert tone="danger">
                Impossible de charger les types d'évaluation. La saisie est indisponible.
              </Alert>
            ) : null}

            <DraftStatus
              dirtyCount={dirty.length}
              invalidCount={invalid.length}
              maxValue={maxValue}
              queued={pendingForThis !== undefined}
            />

            {!selected ? (
              <EmptyState
                icon="◫"
                title="Aucune classe sélectionnée"
                description="Choisissez une classe et une matière ci-dessus pour afficher la grille de saisie."
              />
            ) : (
              <QueryBoundary query={table} loading={<TableSkeleton />}>
                {(rows) => (
                  <EntryGrid
                    rows={rows}
                    drafts={drafts}
                    baseline={baseline}
                    maxValue={maxValue}
                    gradeTypeLabel={activeGradeType?.label ?? ''}
                    onChange={(studentId, patch) =>
                      setEdits((current) => ({
                        ...current,
                        [studentId]: {
                          ...(current[studentId] ?? baseline[studentId] ?? blankDraft),
                          ...patch,
                        },
                      }))
                    }
                  />
                )}
              </QueryBoundary>
            )}
          </div>
        </TermRequired>
      </PageContent>
    </>
  );
}

/**
 * État des brouillons, en clair.
 *
 * Une saisie non enregistrée qui ne dit rien est une saisie perdue à la
 * première navigation : le compte des modifications reste visible en
 * permanence, et les erreurs de barème sont annoncées avant l'envoi.
 */
function DraftStatus({
  dirtyCount, invalidCount, maxValue, queued,
}: { dirtyCount: number; invalidCount: number; maxValue: string; queued: boolean }) {
  if (invalidCount > 0) {
    return (
      <Alert tone="danger">
        {formatCount(invalidCount)} {plural(invalidCount, 'note')} hors barème : les valeurs
        doivent être comprises entre 0 et {maxValue}.
      </Alert>
    );
  }

  if (queued) {
    return (
      <Alert tone="info">
        Cette évaluation est déjà en file d'attente. Elle sera envoyée au retour de la connexion,
        sans risque de doublon.
      </Alert>
    );
  }

  if (dirtyCount === 0) return null;

  return (
    <Alert tone="info">
      {formatCount(dirtyCount)} {plural(dirtyCount, 'modification')} non enregistrée
      {dirtyCount > 1 ? 's' : ''}. Elles seront perdues si vous quittez la page sans enregistrer.
    </Alert>
  );
}

/** Traduit le compte-rendu du backend en une phrase compréhensible. */
function announce(result: GradeBatchResult, toast: ReturnType<typeof useToast>) {
  const applied = result.created + result.updated + result.deleted;

  if (applied > 0) {
    const parts: string[] = [];
    if (result.created > 0) parts.push(`${result.created} ajoutée${result.created > 1 ? 's' : ''}`);
    if (result.updated > 0) parts.push(`${result.updated} modifiée${result.updated > 1 ? 's' : ''}`);
    if (result.deleted > 0) parts.push(`${result.deleted} supprimée${result.deleted > 1 ? 's' : ''}`);
    toast.success(`Notes enregistrées : ${parts.join(', ')}`);
  } else if (result.unchanged > 0) {
    toast.info('Aucun changement : ces notes étaient déjà enregistrées');
  }

  const ambiguous = result.skipped.filter((s) => s.reason === 'notes_multiples').length;
  if (ambiguous > 0) {
    toast.info(
      `${ambiguous} élève(s) ont déjà plusieurs notes de ce type : corrigez-les une par une depuis l'historique.`,
    );
  }

  const outside = result.skipped.filter((s) => s.reason === 'eleve_hors_classe').length;
  if (outside > 0) {
    toast.error(`${outside} élève(s) ne font plus partie de cette classe et ont été ignorés.`);
  }
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
