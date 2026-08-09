import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { gradesApi, type ID } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useTermContext } from '../../context/term-context';
import { formatCount, plural } from '../../lib/format';
import { Alert, Card, EmptyState, Skeleton } from '../../ui';
import { EvaluationList } from './EvaluationList';
import { EvaluationSaisie } from './EvaluationSaisie';

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
  const [creating, setCreating] = useState(false);

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
        creating={creating}
        onCreatingChange={setCreating}
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
                    <span className="tpick__title">{item.className} · {item.subjectName}</span>
                    <span className="tpick__meta">
                      {item.effectif === 0
                        ? 'Aucun élève inscrit'
                        : `${formatCount(item.evalues)}/${formatCount(item.effectif)} ${plural(item.effectif, 'élève')} noté${item.evalues > 1 ? 's' : ''}`}
                    </span>
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
