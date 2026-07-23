import { useState } from 'react';

import {
  classesApi, errorMessage, studentsApi, subjectsApi, teachersApi, type ID,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { formatCount, formatDate, plural } from '../../lib/format';
import { personName } from '../../lib/text';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import {
  Alert, Button, Card, Chip, DataTable, EmptyState, Skeleton, useToast, type Column,
} from '../../ui';
import { PermanentDeleteDialog } from './PermanentDeleteDialog';

type Tab = 'classes' | 'subjects' | 'teachers' | 'students';

const TABS: { id: Tab; label: string }[] = [
  { id: 'classes', label: 'Classes' },
  { id: 'subjects', label: 'Matières' },
  { id: 'teachers', label: 'Enseignants' },
  { id: 'students', label: 'Élèves' },
];

/**
 * Éléments archivés : restauration et suppression définitive.
 *
 * L'archivage est le comportement par défaut de toutes les suppressions de
 * l'application. Sans cet écran, un archivage fait par erreur était
 * irréversible depuis l'interface — l'élément existait toujours en base, mais
 * plus aucun écran ne pouvait le montrer.
 *
 * C'est aussi le seul endroit d'où l'on peut réellement effacer : la
 * suppression définitive n'a de sens qu'après un archivage, une fois qu'on a
 * constaté que l'élément ne sert plus.
 */
export default function ArchivesPage() {
  const [tab, setTab] = useState<Tab>('classes');

  return (
    <>
      <PageHeader title="Archives" subtitle="Éléments archivés, restaurables à tout moment" />
      <PageContent>
        <div className="page-stack">
          <Alert tone="info">
            Archiver ne supprime rien : les notes et l'historique sont conservés. Un élément
            restauré réapparaît immédiatement dans les listes. La suppression définitive, elle,
            est refusée tant que des notes ou des élèves en dépendent.
          </Alert>

          <div className="page-toolbar" role="tablist" aria-label="Type d'élément archivé">
            {TABS.map((item) => (
              <Button
                key={item.id}
                role="tab"
                aria-selected={tab === item.id}
                variant={tab === item.id ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {tab === 'classes' ? <ArchivedClasses /> : null}
          {tab === 'subjects' ? <ArchivedSubjects /> : null}
          {tab === 'teachers' ? <ArchivedTeachers /> : null}
          {tab === 'students' ? <ArchivedStudents /> : null}
        </div>
      </PageContent>
    </>
  );
}

/** Le backend renvoie tout avec `include_archived` : on isole les archivés. */
function onlyArchived<T extends { archivedAt: string | null }>(rows: T[]): T[] {
  return rows.filter((row) => row.archivedAt !== null);
}

function RowActions({
  onRestore, onDelete, restoring, restoreLabel,
}: {
  onRestore: () => void;
  onDelete: () => void;
  restoring: boolean;
  restoreLabel?: string;
}) {
  return (
    <div className="cell-actions">
      <Button size="sm" variant="tonal" loading={restoring} onClick={onRestore}>
        {restoreLabel ?? 'Restaurer'}
      </Button>
      <Button size="sm" variant="danger" onClick={onDelete}>
        Supprimer
      </Button>
    </div>
  );
}

function Empty({ what }: { what: string }) {
  return (
    <EmptyState
      icon="✓"
      title={`Aucune ${what} archivée`}
      description="Tout est actif. Les éléments archivés apparaîtront ici."
    />
  );
}

function ArchivedClasses() {
  const toast = useToast();
  const classes = classesApi.useClasses(undefined, true);
  const restore = classesApi.useRestoreClass();
  const remove = classesApi.useDeleteClass();

  const [toDelete, setToDelete] = useState<{ id: ID; name: string; effectif: number } | null>(null);

  async function runRestore(id: ID, name: string) {
    try {
      await restore.mutateAsync(id);
      toast.success(`${name} restaurée`);
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  return (
    <>
      <QueryBoundary query={classes} loading={<TableSkeleton />}>
        {(items) => {
          const rows = onlyArchived(items);
          const columns: Column<(typeof rows)[number]>[] = [
            { key: 'name', header: 'Classe', render: (row) => <strong>{row.name}</strong> },
            { key: 'level', header: 'Niveau', render: (row) => row.level },
            {
              key: 'headcount',
              header: 'Effectif',
              align: 'numeric',
              render: (row) => formatCount(row.effectif),
            },
            {
              key: 'actions',
              header: '',
              align: 'numeric',
              render: (row) => (
                <RowActions
                  restoring={restore.isPending}
                  onRestore={() => void runRestore(row.id, row.name)}
                  onDelete={() => setToDelete({ id: row.id, name: row.name, effectif: row.effectif })}
                />
              ),
            },
          ];

          return (
            <DataTable
              caption="Classes archivées"
              columns={columns}
              rows={rows}
              rowKey={(row) => String(row.id)}
              empty={<Empty what="classe" />}
            />
          );
        }}
      </QueryBoundary>

      <PermanentDeleteDialog
        open={toDelete !== null}
        title={`Supprimer ${toDelete?.name ?? ''} définitivement ?`}
        description={
          toDelete && toDelete.effectif > 0
            ? `${formatCount(toDelete.effectif)} ${plural(toDelete.effectif, 'élève')} y ${toDelete.effectif > 1 ? 'sont' : 'est'} rattaché${toDelete.effectif > 1 ? 's' : ''} : la suppression sera refusée. Réaffectez-les d'abord à une autre classe.`
            : 'La classe et ses coefficients sont effacés.'
        }
        pending={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await remove.mutateAsync({ id: toDelete.id, permanent: true });
          toast.success(`${toDelete.name} supprimée définitivement`);
          setToDelete(null);
        }}
      />
    </>
  );
}

function ArchivedSubjects() {
  const toast = useToast();
  const subjects = subjectsApi.useSubjects(true);
  const restore = subjectsApi.useRestoreSubject();
  const remove = subjectsApi.useDeleteSubject();

  const [toDelete, setToDelete] = useState<{ id: ID; name: string } | null>(null);

  async function runRestore(id: ID, name: string) {
    try {
      await restore.mutateAsync(id);
      toast.success(`${name} restaurée`);
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  return (
    <>
      <QueryBoundary query={subjects} loading={<TableSkeleton />}>
        {(items) => {
          const rows = onlyArchived(items);
          const columns: Column<(typeof rows)[number]>[] = [
            { key: 'name', header: 'Matière', render: (row) => <strong>{row.name}</strong> },
            {
              key: 'coefficient',
              header: 'Coefficient',
              render: (row) => <Chip tone="info">× {row.coefficient}</Chip>,
            },
            {
              key: 'actions',
              header: '',
              align: 'numeric',
              render: (row) => (
                <RowActions
                  restoring={restore.isPending}
                  onRestore={() => void runRestore(row.id, row.name)}
                  onDelete={() => setToDelete({ id: row.id, name: row.name })}
                />
              ),
            },
          ];

          return (
            <DataTable
              caption="Matières archivées"
              columns={columns}
              rows={rows}
              rowKey={(row) => String(row.id)}
              empty={<Empty what="matière" />}
            />
          );
        }}
      </QueryBoundary>

      <PermanentDeleteDialog
        open={toDelete !== null}
        title={`Supprimer ${toDelete?.name ?? ''} définitivement ?`}
        description="La matière est effacée du programme. La suppression est refusée si des notes y sont rattachées, pour ne pas les effacer en cascade."
        pending={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await remove.mutateAsync({ id: toDelete.id, permanent: true });
          toast.success(`${toDelete.name} supprimée définitivement`);
          setToDelete(null);
        }}
      />
    </>
  );
}

function ArchivedTeachers() {
  const toast = useToast();
  const teachers = teachersApi.useTeachers(true);
  const restore = teachersApi.useRestoreTeacher();
  const remove = teachersApi.useDeleteTeacher();

  const [toDelete, setToDelete] = useState<{ id: ID; name: string } | null>(null);

  async function runRestore(id: ID, name: string) {
    try {
      await restore.mutateAsync(id);
      toast.success(`Compte de ${name} réactivé`);
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  return (
    <>
      <QueryBoundary query={teachers} loading={<TableSkeleton />}>
        {(items) => {
          const rows = onlyArchived(items);
          const columns: Column<(typeof rows)[number]>[] = [
            {
              key: 'name',
              header: 'Enseignant',
              render: (row) => (
                <div>
                  <div style={{ fontWeight: 600 }}>{personName(row, 'Compte sans nom')}</div>
                  <div className="list-row__meta">{row.email}</div>
                </div>
              ),
            },
            {
              key: 'archivedAt',
              header: 'Désactivé le',
              render: (row) => <span className="t-muted">{formatDate(row.archivedAt)}</span>,
            },
            {
              key: 'actions',
              header: '',
              align: 'numeric',
              render: (row) => (
                <RowActions
                  restoreLabel="Réactiver"
                  restoring={restore.isPending}
                  onRestore={() => void runRestore(row.id, personName(row))}
                  onDelete={() => setToDelete({ id: row.id, name: personName(row, row.email) })}
                />
              ),
            },
          ];

          return (
            <DataTable
              caption="Comptes enseignants désactivés"
              columns={columns}
              rows={rows}
              rowKey={(row) => String(row.id)}
              empty={<Empty what="compte enseignant archivé" />}
            />
          );
        }}
      </QueryBoundary>

      <PermanentDeleteDialog
        open={toDelete !== null}
        title={`Supprimer le compte de ${toDelete?.name ?? ''} ?`}
        description="Le compte est effacé. La suppression est refusée si cet enseignant a saisi des notes : elles doivent rester attribuées."
        pending={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await remove.mutateAsync({ id: toDelete.id, permanent: true });
          toast.success('Compte supprimé définitivement');
          setToDelete(null);
        }}
      />
    </>
  );
}

function ArchivedStudents() {
  const toast = useToast();
  const students = studentsApi.useStudents({ includeArchived: true });
  const restore = studentsApi.useRestoreStudent();
  const remove = studentsApi.useDeleteStudent();

  const [toDelete, setToDelete] = useState<{ id: ID; name: string } | null>(null);

  async function runRestore(id: ID, name: string) {
    try {
      await restore.mutateAsync(id);
      toast.success(`${name} réinscrit`);
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  return (
    <>
      <QueryBoundary query={students} loading={<TableSkeleton />}>
        {(page) => {
          const rows = onlyArchived(page.students);
          const columns: Column<(typeof rows)[number]>[] = [
            {
              key: 'name',
              header: 'Élève',
              render: (row) => (
                <strong>
                  {row.firstName} {row.lastName}
                </strong>
              ),
            },
            {
              key: 'class',
              header: 'Classe',
              render: (row) => <Chip tone="neutral">{row.classe.name}</Chip>,
            },
            {
              key: 'archivedAt',
              header: 'Archivé le',
              render: (row) => <span className="t-muted">{formatDate(row.archivedAt)}</span>,
            },
            {
              key: 'actions',
              header: '',
              align: 'numeric',
              render: (row) => (
                <RowActions
                  restoring={restore.isPending}
                  onRestore={() => void runRestore(row.id, `${row.firstName} ${row.lastName}`)}
                  onDelete={() =>
                    setToDelete({ id: row.id, name: `${row.firstName} ${row.lastName}` })
                  }
                />
              ),
            },
          ];

          return (
            <div className="page-stack">
              {page.total > page.pageSize ? (
                <p className="t-body-md t-muted">
                  Première page seulement — {formatCount(page.total)}{' '}
                  {plural(page.total, 'élève')} au total, archivés compris.
                </p>
              ) : null}
              <DataTable
                caption="Élèves archivés"
                columns={columns}
                rows={rows}
                rowKey={(row) => String(row.id)}
                empty={<Empty what="élève archivé" />}
              />
            </div>
          );
        }}
      </QueryBoundary>

      <PermanentDeleteDialog
        open={toDelete !== null}
        title="Supprimer cet élève définitivement ?"
        description="L'élève, toutes ses notes et son rattachement aux parents sont effacés. Les bulletins passés le perdront aussi."
        // Le backend exige le nom exact : c'est la seule suppression de
        // l'application qui détruise une scolarité entière.
        confirmName={toDelete?.name}
        pending={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={async (typedName) => {
          if (!toDelete) return;
          await remove.mutateAsync({ id: toDelete.id, permanent: true, confirmName: typedName });
          toast.success('Élève supprimé définitivement');
          setToDelete(null);
        }}
      />
    </>
  );
}

function TableSkeleton() {
  return (
    <Card padded>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} height={44} style={{ marginBottom: 12 }} />
      ))}
    </Card>
  );
}
