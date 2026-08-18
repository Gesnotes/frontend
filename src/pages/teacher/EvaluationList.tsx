import { NotebookPen, TrendingDown, Trophy } from 'lucide-react';
import { useState } from 'react';

import {
  classesApi, errorMessage, evaluationsApi, type Evaluation, type ID, type TeacherClassAssignment,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { usePendingBatches } from '../../hooks/usePendingBatches';
import { formatCount, formatDate, formatGrade, plural } from '../../lib/format';
import { Alert, Button, Card, Chip, ConfirmDialog, EmptyState, Skeleton, useToast } from '../../ui';
import { CreateEvaluationDialog } from './CreateEvaluationDialog';
import { PendingBatchesBanner } from './PendingBatchesBanner';

/**
 * Évaluations d'un couple classe × matière : les lister, en créer une, ouvrir
 * sa grille de saisie. Commun à l'enseignant et à l'administration — ce qui
 * change entre les deux, c'est uniquement la façon dont le couple a été choisi
 * en amont (une affectation, ou l'école entière).
 *
 * L'en-tête, lui, ne l'est pas : l'enseignant reste dans son coquille mobile
 * (`header="mobile"`, par défaut), l'administration fournit son propre
 * `PageHeader` desktop et passe `header="none"` — la création reste pilotée
 * depuis là par les mêmes `creating`/`onCreatingChange`, remontés en props
 * plutôt que gardés en état interne, pour que le bouton « + Évaluation » de
 * l'un ou l'autre en-tête déclenche la même boîte de dialogue.
 */
export function EvaluationList({
  selected, classId, subjectId, termId, locked, onOpen, onChangeAssignment,
  header = 'mobile', creating, onCreatingChange,
}: {
  selected: TeacherClassAssignment;
  classId: ID;
  subjectId: ID;
  termId: ID;
  locked: boolean;
  onOpen: (id: ID) => void;
  onChangeAssignment: () => void;
  header?: 'mobile' | 'none';
  creating: boolean;
  onCreatingChange: (value: boolean) => void;
}) {
  const toast = useToast();
  const evaluations = evaluationsApi.useEvaluations(classId, subjectId, termId);
  const remove = evaluationsApi.useDeleteEvaluation();
  const { pending, isOnline, flush, discard } = usePendingBatches();
  const [toDelete, setToDelete] = useState<Evaluation | null>(null);

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await remove.mutateAsync(toDelete.id);
      toast.success(`« ${toDelete.label} » supprimée`);
      setToDelete(null);
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  return (
    <>
      {header === 'mobile' ? (
        <>
          <button className="tsaisie-back" onClick={onChangeAssignment}>← Changer de classe</button>

          <div className="tsaisie-head">
            <div>
              <h1 className="tshell__page-title">{selected.className}</h1>
              <p className="tshell__page-subtitle">{selected.subjectName}</p>
            </div>
            <Button size="sm" disabled={locked} onClick={() => onCreatingChange(true)}>+ Évaluation</Button>
          </div>
        </>
      ) : null}

      {locked ? (
        <Alert tone="info">
          Ce trimestre est terminé : la saisie et la création d'évaluations n'y sont plus possibles.
          Demandez à l'administration de rouvrir la période pour une correction.
        </Alert>
      ) : null}

      <PendingBatchesBanner
        pending={pending}
        isOnline={isOnline}
        onRetry={() => void flush()}
        onDiscard={discard}
      />

      <SubjectExtremes classId={classId} subjectId={subjectId} termId={termId} />

      <QueryBoundary query={evaluations} loading={<CardsSkeleton />}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState
              icon={<NotebookPen size={28} />}
              title="Aucune évaluation"
              description="Créez une première évaluation (interrogation, devoir, composition) pour commencer la saisie."
              action={locked ? undefined : { label: 'Nouvelle évaluation', onClick: () => onCreatingChange(true) }}
            />
          ) : (
            <div className="tcards">
              {items.map((evaluation) => (
                <div key={evaluation.id} className="tpick-row">
                  <button className="tpick" onClick={() => onOpen(evaluation.id)}>
                    <span className="tpick__body">
                      <span className="tpick__title">{evaluation.label}</span>
                      <span className="tpick__meta">
                        <Chip tone="info">{evaluation.type.label}</Chip>
                        {evaluation.date ? ` · ${formatDate(evaluation.date)}` : ''}
                        {' · '}
                        {formatCount(evaluation.gradedCount)}/{formatCount(selected.effectif)}{' '}
                        {plural(selected.effectif, 'élève')}
                      </span>
                    </span>
                    <span className="tpick__chevron" aria-hidden="true">›</span>
                  </button>
                  {/* Le backend refuse aussi la suppression sur un trimestre
                      clos : le bouton ne doit pas promettre le contraire. */}
                  <button
                    className="tpick__delete"
                    disabled={locked}
                    aria-label={`Supprimer l'évaluation ${evaluation.label}`}
                    onClick={() => setToDelete(evaluation)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )
        }
      </QueryBoundary>

      <CreateEvaluationDialog
        open={creating}
        classId={classId}
        subjectId={subjectId}
        termId={termId}
        onClose={() => onCreatingChange(false)}
        onCreated={(evaluation: Evaluation) => {
          onCreatingChange(false);
          onOpen(evaluation.id);
        }}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title={`Supprimer « ${toDelete?.label ?? ''} » ?`}
        description={
          toDelete && toDelete.gradedCount > 0
            ? `${formatCount(toDelete.gradedCount)} ${plural(toDelete.gradedCount, 'note')} déjà saisie${toDelete.gradedCount > 1 ? 's' : ''} ${toDelete.gradedCount > 1 ? 'seront effacées' : 'sera effacée'} avec l'évaluation. Cette action est définitive.`
            : "L'évaluation est effacée. Elle ne contient aucune note."
        }
        confirmLabel="Supprimer"
        loading={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}

function CardsSkeleton() {
  return (
    <div className="tcards">
      {[0, 1, 2].map((i) => (
        <Card key={i} padded>
          <Skeleton width="55%" height={20} />
          <Skeleton width="40%" height={12} style={{ marginTop: 10 }} />
        </Card>
      ))}
    </div>
  );
}

/**
 * Meilleure et plus faible moyenne de la classe, pour la seule matière en
 * cours de saisie. Réutilise `GET /classes/:id` (déjà accessible à
 * l'enseignant affecté à la classe, cf. `assertCanViewClass`) plutôt qu'un
 * nouvel endpoint : la réponse porte déjà les moyennes de toutes les
 * matières, il suffit de filtrer côté client sur `subjectId`.
 */
function SubjectExtremes({ classId, subjectId, termId }: { classId: ID; subjectId: ID; termId: ID }) {
  const detail = classesApi.useClassDetail(classId, termId);
  const noted = (detail.data?.students ?? [])
    .map((student) => ({
      student,
      average: student.subjects.find((s) => s.subjectId === subjectId)?.average ?? null,
    }))
    .filter((entry): entry is { student: typeof entry.student; average: number } => entry.average !== null)
    .sort((a, b) => b.average - a.average);

  if (noted.length === 0) return null;

  const best = noted[0];
  const worst = noted.length > 1 ? noted[noted.length - 1] : null;

  return (
    <div className="tsaisie-extremes">
      <Chip tone="success">
        <Trophy size={13} aria-hidden="true" /> {best.student.firstName} {best.student.lastName} · {formatGrade(best.average)}
      </Chip>
      {worst ? (
        <Chip tone="danger">
          <TrendingDown size={13} aria-hidden="true" /> {worst.student.firstName} {worst.student.lastName} · {formatGrade(worst.average)}
        </Chip>
      ) : null}
    </div>
  );
}
