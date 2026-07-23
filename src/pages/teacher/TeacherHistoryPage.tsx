import { useState } from 'react';

import {
  errorMessage, gradesApi, referentialsApi,
  type Grade, type ID, type TeacherGradeHistoryItem,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useTermContext } from '../../context/term-context';
import { formatCount, formatDateShort, plural } from '../../lib/format';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import { TermSelect } from '../../layouts/TermSelect';
import {
  Button, Card, Chip, ConfirmDialog, DataTable, EmptyState, Skeleton,
  gradeTone, useToast, type Column,
} from '../../ui';
import { GradeEditModal } from './GradeEditModal';

export default function TeacherHistoryPage() {
  const { termId, term } = useTermContext();
  const toast = useToast();

  const assignments = gradesApi.useMyClasses(termId);
  const gradeTypes = referentialsApi.useGradeTypes();

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

  const columns: Column<TeacherGradeHistoryItem>[] = [
    {
      key: 'student',
      header: 'Élève',
      render: (row) => (
        <span style={{ fontWeight: 600 }}>
          {row.eleve.firstName} {row.eleve.lastName}
        </span>
      ),
    },
    {
      key: 'subject',
      header: 'Matière',
      render: (row) => row.matiere.name,
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => <Chip tone="info">{row.type.label}</Chip>,
    },
    {
      key: 'value',
      header: 'Note',
      render: (row) => (
        <Chip tone={gradeTone(row.value, row.maxValue)}>
          {row.value} / {row.maxValue}
        </Chip>
      ),
    },
    {
      key: 'period',
      header: 'Période',
      render: (row) => <span className="t-muted">{row.periode.label}</span>,
    },
    {
      key: 'date',
      header: 'Saisie le',
      render: (row) => <span className="t-muted">{formatDateShort(row.createdAt)}</span>,
    },
    {
      key: 'comment',
      header: 'Commentaire',
      render: (row) =>
        row.comment ? (
          <span title={row.comment} className="t-muted">
            {row.comment.length > 40 ? `${row.comment.slice(0, 40)}…` : row.comment}
          </span>
        ) : (
          <span className="t-subtle">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'numeric',
      render: (row) => (
        <div className="cell-actions">
          <Button size="sm" variant="tonal" onClick={() => setEditing(row)}>Modifier</Button>
          <Button size="sm" variant="danger" onClick={() => setToDelete(row)}>Supprimer</Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Historique des notes"
        subtitle={
          term ? `Notes que vous avez saisies · ${term.label}` : 'Notes que vous avez saisies'
        }
        actions={<TermSelect />}
      />
      <PageContent>
        <div className="page-stack">
          <div className="page-toolbar">
            <label className="ui-field" style={{ minWidth: 200 }}>
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

            <label className="ui-field" style={{ minWidth: 200 }}>
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

          <QueryBoundary query={history} loading={<TableSkeleton />}>
            {(rows) => (
              <>
                <p className="t-body-md t-muted">
                  {formatCount(rows.length)} {plural(rows.length, 'note')}
                  {rows.length >= 200 ? ' (200 plus récentes)' : ''}
                </p>
                <DataTable
                  caption="Historique des notes saisies"
                  columns={columns}
                  rows={rows}
                  rowKey={(row) => String(row.id)}
                  empty={
                    <EmptyState
                      icon="↺"
                      title="Aucune note saisie"
                      description="Les notes que vous enregistrerez apparaîtront ici, avec la possibilité de les corriger."
                    />
                  }
                />
              </>
            )}
          </QueryBoundary>
        </div>
      </PageContent>

      <GradeEditModal
        key={editing?.id ?? 'none'}
        grade={editing}
        gradeTypes={gradeTypes.data ?? []}
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

function TableSkeleton() {
  return (
    <Card padded>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} height={44} style={{ marginBottom: 12 }} />
      ))}
    </Card>
  );
}
