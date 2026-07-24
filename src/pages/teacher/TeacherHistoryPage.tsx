import { useState } from 'react';

import {
  errorMessage, gradesApi,
  type Grade, type ID, type TeacherGradeHistoryItem,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useTermContext } from '../../context/term-context';
import { formatCount, formatDate, formatDateShort, plural } from '../../lib/format';
import {
  Button, Card, Chip, ConfirmDialog, EmptyState, Skeleton, gradeTone, useToast,
} from '../../ui';
import { GradeEditModal } from './GradeEditModal';

export default function TeacherHistoryPage() {
  const { termId, term } = useTermContext();
  const toast = useToast();

  const assignments = gradesApi.useMyClasses(termId);

  const [classId, setClassId] = useState<ID | ''>('');
  const [subjectId, setSubjectId] = useState<ID | ''>('');

  const history = gradesApi.useMyGradeHistory({
    classId: classId === '' ? undefined : classId,
    subjectId: subjectId === '' ? undefined : subjectId,
    termId,
  });

  const [editing, setEditing] = useState<Grade | null>(null);
  const [toDelete, setToDelete] = useState<TeacherGradeHistoryItem | null>(null);
  const deleteGrade = gradesApi.useDeleteGrade();

  // Les affectations portent des doublons de classe et de matière : une même
  // classe apparaît une fois par matière enseignée.
  const classes = [
    ...new Map(
      (assignments.data ?? []).map((a) => [a.classId, { id: a.classId, name: a.className }]),
    ).values(),
  ];
  const subjects = [
    ...new Map(
      (assignments.data ?? []).map((a) => [a.subjectId, { id: a.subjectId, name: a.subjectName }]),
    ).values(),
  ];

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
      <div>
        <h1 className="tshell__page-title">Historique</h1>
        <p className="tshell__page-subtitle">
          {term ? `Notes que vous avez saisies · ${term.label}` : 'Notes que vous avez saisies'}
        </p>
      </div>

      <div className="page-toolbar">
        <label className="ui-field" style={{ flex: 1, minWidth: 140 }}>
          <span className="sr-only">Filtrer par classe</span>
          <select
            className="ui-select"
            value={classId}
            onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Toutes mes classes</option>
            {classes.map((klass) => (
              <option key={klass.id} value={klass.id}>{klass.name}</option>
            ))}
          </select>
        </label>

        <label className="ui-field" style={{ flex: 1, minWidth: 140 }}>
          <span className="sr-only">Filtrer par matière</span>
          <select
            className="ui-select"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Toutes mes matières</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
        </label>
      </div>

      <QueryBoundary query={history} loading={<ListSkeleton />}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState
              icon="↺"
              title="Aucune note saisie"
              description="Les notes que vous enregistrerez apparaîtront ici, avec la possibilité de les corriger."
            />
          ) : (
            <>
              <p className="t-body-md t-muted">
                {formatCount(rows.length)} {plural(rows.length, 'note')}
                {rows.length >= 200 ? ' (200 plus récentes)' : ''}
              </p>
              <div className="tcards">
                {rows.map((row) => (
                  <Card key={row.id} padded>
                    <div className="tsaisie-row">
                      <span className="tsaisie-name">
                        {row.eleve.firstName} {row.eleve.lastName}
                      </span>
                      <Chip tone={gradeTone(row.value, row.maxValue)}>
                        {row.value} / {row.maxValue}
                      </Chip>
                    </div>

                    <p className="tpick__meta" style={{ marginTop: 'var(--space-2)' }}>
                      <strong>{row.evaluation.label}</strong>
                      <Chip tone="info">{row.type.label}</Chip>
                      {' · '}{row.matiere.name}
                      {' · '}{row.periode.label}
                      {row.evaluation.date
                        ? ` · ${formatDate(row.evaluation.date)}`
                        : ` · saisie le ${formatDateShort(row.createdAt)}`}
                    </p>

                    {row.comment ? (
                      <p className="t-body-md t-muted" style={{ marginTop: 'var(--space-2)' }}>
                        {row.comment}
                      </p>
                    ) : null}

                    <div className="card-actions">
                      <Button size="sm" variant="tonal" onClick={() => setEditing(row)}>Modifier</Button>
                      <Button size="sm" variant="danger" onClick={() => setToDelete(row)}>Supprimer</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )
        }
      </QueryBoundary>

      <GradeEditModal
        key={editing?.id ?? 'none'}
        grade={editing}
        onClose={() => setEditing(null)}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cette note ?"
        description={
          toDelete
            ? `La note de ${toDelete.eleve.firstName} ${toDelete.eleve.lastName} en ${toDelete.matiere.name} sera retirée de son bulletin et sa moyenne recalculée. Cette action est irréversible.`
            : ''
        }
        confirmLabel="Supprimer"
        loading={deleteGrade.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="tcards">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} padded>
          <Skeleton width="50%" height={20} />
          <Skeleton width="70%" height={12} style={{ marginTop: 10 }} />
        </Card>
      ))}
    </div>
  );
}
