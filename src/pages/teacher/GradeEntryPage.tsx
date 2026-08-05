import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  errorMessage, evaluationsApi, gradesApi,
  type Evaluation, type ID, type TeacherClassAssignment,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useTermContext } from '../../context/term-context';
import { usePendingBatches } from '../../hooks/usePendingBatches';
import { formatCount, formatDate, plural } from '../../lib/format';
import { Alert, Button, Card, Chip, ConfirmDialog, EmptyState, Skeleton, useToast } from '../../ui';
import { CreateEvaluationDialog } from './CreateEvaluationDialog';
import { EvaluationSaisie } from './EvaluationSaisie';
import { PendingBatchesBanner } from './PendingBatchesBanner';

/**
 * Saisie des notes, mobile d'abord, en trois temps :
 * 1. choisir une classe × matière,
 * 2. choisir (ou créer) une évaluation,
 * 3. saisir les notes.
 *
 * Le contexte vit dans l'URL (`classe`, `matiere`, `eval`) : recharger la page
 * ou la mettre en favori retrouve le même écran.
 */
export default function GradeEntryPage() {
  const [params, setParams] = useSearchParams();
  const { termId, term } = useTermContext();
  const assignments = gradesApi.useMyClasses(termId);

  /**
   * Verrou de trimestre clos, tel que le backend le calcule.
   *
   * Il tient compte d'une réouverture éventuellement accordée par
   * l'administration : le recalculer ici sur `endDate` annoncerait une période
   * fermée alors que l'API accepte l'écriture, et l'inverse à l'expiration.
   */
  const locked = term !== undefined && !term.isOpenForEntry;

  const classId = params.get('classe') ? Number(params.get('classe')) : undefined;
  const subjectId = params.get('matiere') ? Number(params.get('matiere')) : undefined;
  const evalId = params.get('eval') ? Number(params.get('eval')) : undefined;

  const selected = assignments.data?.find(
    (a) => a.classId === classId && a.subjectId === subjectId,
  );

  function pick(nextClass: ID, nextSubject: ID) {
    setParams({ classe: String(nextClass), matiere: String(nextSubject) });
  }
  function clearSelection() {
    setParams({});
  }
  function openEvaluation(id: ID) {
    if (classId === undefined || subjectId === undefined) return;
    setParams({ classe: String(classId), matiere: String(subjectId), eval: String(id) });
  }
  function closeEvaluation() {
    if (classId === undefined || subjectId === undefined) return setParams({});
    setParams({ classe: String(classId), matiere: String(subjectId) });
  }

  if (termId === undefined) {
    return (
      <>
        <h1 className="tshell__page-title">Saisie des notes</h1>
        <Alert tone="info">
          Aucune période active. Votre administration doit d'abord ouvrir une période pour permettre
          la saisie.
        </Alert>
      </>
    );
  }

  if (evalId !== undefined) {
    return <EvaluationSaisie evaluationId={evalId} locked={locked} onBack={closeEvaluation} />;
  }

  if (selected && classId !== undefined && subjectId !== undefined) {
    return (
      <EvaluationList
        selected={selected}
        classId={classId}
        subjectId={subjectId}
        termId={termId}
        locked={locked}
        onOpen={openEvaluation}
        onChangeAssignment={clearSelection}
      />
    );
  }

  return (
    <>
      <div>
        <h1 className="tshell__page-title">Saisie des notes</h1>
        <p className="tshell__page-subtitle">
          {term ? `Choisissez une classe · ${term.label}` : 'Choisissez une classe'}
        </p>
      </div>

      <QueryBoundary query={assignments} loading={<CardsSkeleton />}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState
              icon="✎"
              title="Aucune classe affectée"
              description="Sans affectation classe × matière, la saisie de notes n'est pas autorisée."
            />
          ) : (
            <div className="tcards">
              {items.map((item) => (
                <button
                  key={item.assignmentId}
                  className="tpick"
                  onClick={() => pick(item.classId, item.subjectId)}
                >
                  <span className="tpick__body">
                    <span className="tpick__title">{item.className}</span>
                    <span className="tpick__meta">{item.subjectName}</span>
                  </span>
                  <span className="tpick__chevron" aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          )
        }
      </QueryBoundary>
    </>
  );
}

function EvaluationList({
  selected, classId, subjectId, termId, locked, onOpen, onChangeAssignment,
}: {
  selected: TeacherClassAssignment;
  classId: ID;
  subjectId: ID;
  termId: ID;
  locked: boolean;
  onOpen: (id: ID) => void;
  onChangeAssignment: () => void;
}) {
  const toast = useToast();
  const evaluations = evaluationsApi.useEvaluations(classId, subjectId, termId);
  const remove = evaluationsApi.useDeleteEvaluation();
  const { pending, isOnline, flush, discard } = usePendingBatches();
  const [creating, setCreating] = useState(false);
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
      <button className="tsaisie-back" onClick={onChangeAssignment}>← Changer de classe</button>

      <div className="tsaisie-head">
        <div>
          <h1 className="tshell__page-title">{selected.className}</h1>
          <p className="tshell__page-subtitle">{selected.subjectName}</p>
        </div>
        <Button size="sm" disabled={locked} onClick={() => setCreating(true)}>+ Évaluation</Button>
      </div>

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

      <QueryBoundary query={evaluations} loading={<CardsSkeleton />}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState
              icon="✎"
              title="Aucune évaluation"
              description="Créez une première évaluation (interrogation, devoir, composition) pour commencer la saisie."
              action={locked ? undefined : { label: 'Nouvelle évaluation', onClick: () => setCreating(true) }}
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
        onClose={() => setCreating(false)}
        onCreated={(evaluation: Evaluation) => {
          setCreating(false);
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
