import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { gradesApi, type ID, type TeacherClassAssignment } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useTermContext } from '../../context/term-context';
import { formatCount, plural } from '../../lib/format';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import { TermSelect } from '../../layouts/TermSelect';
import { Alert, Button, Card, Chip, EmptyState, Skeleton } from '../../ui';
import { EvaluationList } from '../teacher/EvaluationList';
import { EvaluationSaisie } from '../teacher/EvaluationSaisie';

type ClassGroup = {
  classId: ID;
  className: string;
  effectif: number;
  subjects: TeacherClassAssignment[];
};

/** Regroupe les affectations classe×matière par classe, triées par nom. */
function groupByClass(items: TeacherClassAssignment[]): ClassGroup[] {
  const groups = new Map<ID, ClassGroup>();
  for (const item of items) {
    const group = groups.get(item.classId);
    if (group) group.subjects.push(item);
    else groups.set(item.classId, { classId: item.classId, className: item.className, effectif: item.effectif, subjects: [item] });
  }
  return [...groups.values()].sort((a, b) => a.className.localeCompare(b.className, 'fr'));
}

/**
 * Saisie des notes par l'administration : le même parcours que celui des
 * enseignants (choisir une classe, puis une matière, puis une évaluation,
 * puis noter), mais sur l'école entière — l'union des affectations de tous
 * les enseignants, pas seulement celles d'un enseignant donné. Les classes
 * sont regroupées en premier niveau : une classe peut porter plusieurs
 * matières, mélanger les deux dans une seule liste plate les noyait toutes.
 *
 * Le contexte vit dans l'URL (`classe`, `matiere`, `eval`), comme côté
 * enseignant : recharger la page ou la mettre en favori retrouve le même écran.
 */
export default function AdminGradeEntryPage() {
  const [params, setParams] = useSearchParams();
  const { termId, term } = useTermContext();
  const assignments = gradesApi.useMyClasses(termId);
  const [creating, setCreating] = useState(false);

  // Contrairement à un enseignant, l'administration n'est jamais bloquée par
  // une période close : `assertTermWritable` (backend) l'exempte explicitement
  // pour les corrections et rattrapages tardifs.
  const locked = false;

  const classId = params.get('classe') ? Number(params.get('classe')) : undefined;
  const subjectId = params.get('matiere') ? Number(params.get('matiere')) : undefined;
  const evalId = params.get('eval') ? Number(params.get('eval')) : undefined;

  const selected = assignments.data?.find(
    (a) => a.classId === classId && a.subjectId === subjectId,
  );

  function pickClass(nextClass: ID) {
    setParams({ classe: String(nextClass) });
  }
  function pickSubject(nextSubject: ID) {
    if (classId === undefined) return;
    setParams({ classe: String(classId), matiere: String(nextSubject) });
  }
  function clearClass() {
    setParams({});
  }
  function backToSubjects() {
    if (classId === undefined) return setParams({});
    setParams({ classe: String(classId) });
  }
  function openEvaluation(id: ID) {
    if (classId === undefined || subjectId === undefined) return;
    setParams({ classe: String(classId), matiere: String(subjectId), eval: String(id) });
  }
  function closeEvaluation() {
    if (classId === undefined || subjectId === undefined) return setParams({});
    setParams({ classe: String(classId), matiere: String(subjectId) });
  }

  if (evalId !== undefined) {
    return (
      <EvaluationGradingScreen evaluationId={evalId} locked={locked} onBack={closeEvaluation} />
    );
  }

  if (selected && classId !== undefined && subjectId !== undefined && termId !== undefined) {
    return (
      <>
        <PageHeader
          back={<Button variant="ghost" aria-label="Changer de matière" onClick={backToSubjects}>‹</Button>}
          title={selected.className}
          subtitle={<Chip tone="info">{selected.subjectName}</Chip>}
          actions={
            <Button size="sm" disabled={locked} onClick={() => setCreating(true)}>+ Évaluation</Button>
          }
        />
        <PageContent>
          <EvaluationList
            selected={selected}
            classId={classId}
            subjectId={subjectId}
            termId={termId}
            locked={locked}
            onOpen={openEvaluation}
            onChangeAssignment={backToSubjects}
            header="none"
            creating={creating}
            onCreatingChange={setCreating}
          />
        </PageContent>
      </>
    );
  }

  return (
    <>
      <PageHeader
        back={classId !== undefined ? <Button variant="ghost" aria-label="Changer de classe" onClick={clearClass}>‹</Button> : undefined}
        title="Saisie des notes"
        subtitle={term ? `Toutes les classes · ${term.label}` : 'Choisissez une classe'}
        actions={<TermSelect />}
      />
      <PageContent>
        {termId === undefined ? (
          <Alert tone="info">
            Aucune période active. Ouvrez d'abord une période depuis Périodes pour permettre la saisie.
          </Alert>
        ) : (
          <QueryBoundary query={assignments} loading={<CardsSkeleton />}>
            {(items) =>
              items.length === 0 ? (
                <EmptyState
                  icon="✎"
                  title="Aucune matière à noter"
                  description="Rattachez des matières à vos classes depuis l'écran Matières pour commencer la saisie."
                />
              ) : (
                <ClassOrSubjectList
                  groups={groupByClass(items)}
                  classId={classId}
                  onPickClass={pickClass}
                  onPickSubject={pickSubject}
                />
              )
            }
          </QueryBoundary>
        )}
      </PageContent>
    </>
  );
}

function ClassOrSubjectList({
  groups, classId, onPickClass, onPickSubject,
}: { groups: ClassGroup[]; classId: ID | undefined; onPickClass: (id: ID) => void; onPickSubject: (id: ID) => void }) {
  const group = groups.find((g) => g.classId === classId);

  if (group) {
    return (
      <div className="tcards">
        {group.subjects.map((item) => (
          <button
            key={item.assignmentId}
            className="tpick"
            onClick={() => onPickSubject(item.subjectId)}
          >
            <span className="tpick__body">
              <span className="tpick__title">{item.subjectName}</span>
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
    );
  }

  return (
    <div className="tcards">
      {groups.map((g) => (
        <button key={g.classId} className="tpick" onClick={() => onPickClass(g.classId)}>
          <span className="tpick__body">
            <span className="tpick__title">{g.className}</span>
            <span className="tpick__meta">
              {formatCount(g.subjects.length)} {plural(g.subjects.length, 'matière')} · {formatCount(g.effectif)} {plural(g.effectif, 'élève')}
            </span>
          </span>
          <span className="tpick__chevron" aria-hidden="true">›</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Grille de notation, avec l'en-tête desktop standard de l'administration.
 *
 * `EvaluationSaisie` charge déjà la grille (`useEvaluationGrid`) ; l'appeler
 * ici aussi ne coûte rien — React Query partage la même entrée de cache — et
 * donne le libellé de l'évaluation avant que `EvaluationSaisie` ne rende quoi
 * que ce soit.
 */
function EvaluationGradingScreen({
  evaluationId, locked, onBack,
}: { evaluationId: ID; locked: boolean; onBack: () => void }) {
  const grid = gradesApi.useEvaluationGrid(evaluationId);
  const evaluation = grid.data?.evaluation;

  return (
    <>
      <PageHeader
        back={<Button variant="ghost" aria-label="Retour aux évaluations" onClick={onBack}>‹</Button>}
        title={evaluation?.label ?? 'Notation'}
        subtitle={
          evaluation ? (
            <>
              <Chip tone="info">{evaluation.type.label}</Chip> · noté sur {evaluation.maxValue}
            </>
          ) : undefined
        }
      />
      <PageContent>
        <EvaluationSaisie evaluationId={evaluationId} locked={locked} onBack={onBack} hideHeader />
      </PageContent>
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
