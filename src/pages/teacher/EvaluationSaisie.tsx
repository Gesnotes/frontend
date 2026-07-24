import { useCallback, useMemo, useState } from 'react';

import {
  errorMessage, gradesApi, isApiError,
  type EvaluationGrid, type GradeBatchEntry, type GradeBatchPayload, type ID,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { usePendingBatches } from '../../hooks/usePendingBatches';
import { offlineQueue } from '../../lib/offlineQueue';
import { formatCount, plural } from '../../lib/format';
import { Alert, Button, Card, EmptyState, Skeleton, useToast } from '../../ui';

type Draft = { value: string; comment: string };

const blank: Draft = { value: '', comment: '' };

function toBaseline(students: EvaluationGrid['students']): Record<number, Draft> {
  const drafts: Record<number, Draft> = {};
  for (const student of students) {
    drafts[student.id] = {
      value: student.note ? String(student.note.value) : '',
      comment: student.note?.comment ?? '',
    };
  }
  return drafts;
}

/**
 * Saisie d'une évaluation, pensée pour le pouce.
 *
 * Une carte par élève, un grand champ numérique, le commentaire replié tant
 * qu'on n'en veut pas. La file d'attente hors connexion est conservée : un
 * enseignant sans réseau enregistre quand même, le lot part au retour.
 */
export function EvaluationSaisie({ evaluationId, onBack }: { evaluationId: ID; onBack: () => void }) {
  const toast = useToast();
  const grid = gradesApi.useEvaluationGrid(evaluationId);
  const saveBatch = gradesApi.useSaveGradeBatch();

  const [edits, setEdits] = useState<Record<number, Draft>>({});

  const students = useMemo(() => grid.data?.students ?? [], [grid.data]);
  const evaluation = grid.data?.evaluation;
  const maxValue = evaluation?.maxValue ?? 20;

  const baseline = useMemo(() => toBaseline(students), [students]);

  // Changer d'évaluation repart d'une grille vierge (ajustement pendant le
  // rendu, pour ne pas afficher les brouillons de l'évaluation précédente).
  const [seenKey, setSeenKey] = useState(evaluationId);
  if (seenKey !== evaluationId) {
    setSeenKey(evaluationId);
    setEdits({});
  }

  const drafts = useMemo(() => ({ ...baseline, ...edits }), [baseline, edits]);

  const dirty = useMemo(
    () =>
      Object.entries(edits).filter(([studentId, draft]) => {
        const before = baseline[Number(studentId)];
        if (!before) return false;
        return draft.value !== before.value || draft.comment !== before.comment;
      }),
    [edits, baseline],
  );

  const invalid = useMemo(
    () =>
      dirty.filter(([, draft]) => {
        if (draft.value === '') return false;
        const parsed = Number(draft.value);
        return Number.isNaN(parsed) || parsed < 0 || parsed > maxValue;
      }),
    [dirty, maxValue],
  );

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

  const { pending, isOnline, flush } = usePendingBatches(onFlushed);
  const queued = pending.some((item) => item.payload.evaluationId === evaluationId);

  function patch(studentId: number, next: Partial<Draft>) {
    setEdits((current) => ({
      ...current,
      [studentId]: { ...(current[studentId] ?? baseline[studentId] ?? blank), ...next },
    }));
  }

  function buildPayload(): GradeBatchPayload {
    const entries: GradeBatchEntry[] = dirty.map(([studentId, draft]) => ({
      studentId: Number(studentId) as ID,
      value: draft.value === '' ? null : Number(draft.value),
      comment: draft.comment.trim() || null,
    }));
    return { evaluationId, entries };
  }

  async function save() {
    if (dirty.length === 0 || invalid.length > 0) return;
    const payload = buildPayload();
    const label = evaluation?.label ?? 'Évaluation';

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
      if (!isApiError(error) || error.status === 0) {
        offlineQueue.enqueue(payload, label);
        setEdits({});
        toast.info('Serveur injoignable — la saisie est conservée et sera envoyée au retour du réseau');
        return;
      }
      toast.error(errorMessage(error));
    }
  }

  const filled = students.filter((s) => (drafts[s.id]?.value ?? '') !== '').length;

  return (
    <>
      <button className="tsaisie-back" onClick={onBack}>← Évaluations</button>

      <div className="tsaisie-head">
        <div>
          <h1 className="tshell__page-title">{evaluation?.label ?? 'Saisie'}</h1>
          <p className="tshell__page-subtitle">
            {evaluation ? `${evaluation.type.label} · noté sur ${evaluation.maxValue}` : ''}
            {students.length > 0 ? ` · ${formatCount(filled)}/${formatCount(students.length)} noté${filled > 1 ? 's' : ''}` : ''}
          </p>
        </div>
      </div>

      {invalid.length > 0 ? (
        <Alert tone="danger">
          {formatCount(invalid.length)} {plural(invalid.length, 'note')} hors barème : entre 0 et {maxValue}.
        </Alert>
      ) : queued ? (
        <Alert tone="info">
          Cette évaluation est en file d'attente. Elle partira au retour du réseau, sans doublon.
        </Alert>
      ) : dirty.length > 0 ? (
        <Alert tone="info">
          {formatCount(dirty.length)} {plural(dirty.length, 'modification')} non enregistrée{dirty.length > 1 ? 's' : ''}.
        </Alert>
      ) : null}

      <QueryBoundary query={grid} loading={<GridSkeleton />}>
        {(data) =>
          data.students.length === 0 ? (
            <EmptyState
              icon="⚇"
              title="Aucun élève dans cette classe"
              description="L'administration doit y inscrire des élèves avant toute saisie."
            />
          ) : (
            <div className="tcards">
              {data.students.map((student) => {
                const draft = drafts[student.id] ?? blank;
                const before = baseline[student.id];
                const changed = before && (draft.value !== before.value || draft.comment !== before.comment);
                const parsed = draft.value === '' ? null : Number(draft.value);
                const outOfRange = parsed !== null && (Number.isNaN(parsed) || parsed < 0 || parsed > maxValue);

                return (
                  <StudentRow
                    key={student.id}
                    name={`${student.firstName} ${student.lastName}`}
                    draft={draft}
                    maxValue={maxValue}
                    changed={!!changed}
                    outOfRange={outOfRange}
                    onValue={(v) => patch(student.id, { value: v })}
                    onComment={(c) => patch(student.id, { comment: c })}
                  />
                );
              })}
            </div>
          )
        }
      </QueryBoundary>

      <div className="tsaisie-bar">
        <Button
          block
          size="lg"
          loading={saveBatch.isPending}
          disabled={dirty.length === 0 || invalid.length > 0}
          onClick={() => void save()}
        >
          {isOnline ? 'Enregistrer' : 'Mettre en attente'}
          {dirty.length > 0 ? ` (${dirty.length})` : ''}
        </Button>
        {queued && isOnline ? (
          <Button variant="secondary" block onClick={() => void flush()}>Renvoyer la file</Button>
        ) : null}
      </div>
    </>
  );
}

function StudentRow({
  name, draft, maxValue, changed, outOfRange, onValue, onComment,
}: {
  name: string;
  draft: Draft;
  maxValue: number;
  changed: boolean;
  outOfRange: boolean;
  onValue: (v: string) => void;
  onComment: (c: string) => void;
}) {
  const [showComment, setShowComment] = useState(draft.comment.length > 0);

  return (
    <Card padded>
      <div className="tsaisie-row">
        <span className="tsaisie-name">
          {name}
          {changed ? <span className="tsaisie-flag">modifié</span> : null}
        </span>
        <div className="tsaisie-note">
          <input
            className="ui-input tsaisie-input"
            type="number"
            inputMode="decimal"
            min={0}
            max={maxValue}
            step={0.25}
            placeholder="—"
            aria-invalid={outOfRange}
            aria-label={`Note de ${name}`}
            value={draft.value}
            onChange={(e) => onValue(e.target.value)}
          />
          <span className="tsaisie-max">/ {maxValue}</span>
        </div>
      </div>

      {showComment ? (
        <input
          className="ui-input"
          style={{ marginTop: 'var(--space-2)' }}
          type="text"
          maxLength={2000}
          placeholder="Commentaire (visible par la famille)"
          aria-label={`Commentaire pour ${name}`}
          value={draft.comment}
          onChange={(e) => onComment(e.target.value)}
        />
      ) : (
        <button className="tsaisie-add-comment" onClick={() => setShowComment(true)}>
          + Commentaire
        </button>
      )}
    </Card>
  );
}

function GridSkeleton() {
  return (
    <div className="tcards">
      {[0, 1, 2, 3, 4].map((i) => (
        <Card key={i} padded>
          <Skeleton height={40} />
        </Card>
      ))}
    </div>
  );
}

function announce(
  result: { created: number; updated: number; deleted: number; unchanged: number; skipped: { studentId: number }[] },
  toast: ReturnType<typeof useToast>,
) {
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

  if (result.skipped.length > 0) {
    toast.error(`${result.skipped.length} élève(s) ne font plus partie de cette classe et ont été ignorés.`);
  }
}
