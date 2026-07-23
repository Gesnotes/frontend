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

type Tab = 'classes' | 'subjects' | 'teachers' | 'students';

const TABS: { id: Tab; label: string }[] = [
  { id: 'classes', label: 'Classes' },
  { id: 'subjects', label: 'Matières' },
  { id: 'teachers', label: 'Enseignants' },
  { id: 'students', label: 'Élèves' },
];

/**
 * Éléments archivés, et leur restauration.
 *
 * L'archivage est le comportement par défaut de toutes les suppressions de
 * l'application : rien ne disparaît vraiment. Sans cet écran, un archivage
 * fait par erreur était irréversible depuis l'interface — l'élément existait
 * toujours en base, mais plus aucun écran ne pouvait le montrer.
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
            restauré réapparaît immédiatement dans les listes.
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

function RestoreButton({
  onRestore, pending, label,
}: { onRestore: () => void; pending: boolean; label?: string }) {
  return (
    <div className="cell-actions">
      <Button size="sm" variant="tonal" loading={pending} onClick={onRestore}>
        {label ?? 'Restaurer'}
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

  async function run(id: ID, name: string) {
    try {
      await restore.mutateAsync(id);
      toast.success(`${name} restaurée`);
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  return (
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
              <RestoreButton
                pending={restore.isPending}
                onRestore={() => void run(row.id, row.name)}
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
  );
}

function ArchivedSubjects() {
  const toast = useToast();
  const subjects = subjectsApi.useSubjects(true);
  const restore = subjectsApi.useRestoreSubject();

  async function run(id: ID, name: string) {
    try {
      await restore.mutateAsync(id);
      toast.success(`${name} restaurée`);
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  return (
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
              <RestoreButton
                pending={restore.isPending}
                onRestore={() => void run(row.id, row.name)}
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
  );
}

function ArchivedTeachers() {
  const toast = useToast();
  const teachers = teachersApi.useTeachers(true);
  const restore = teachersApi.useRestoreTeacher();

  async function run(id: ID, name: string) {
    try {
      await restore.mutateAsync(id);
      toast.success(`Compte de ${name} réactivé`);
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  return (
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
              <RestoreButton
                label="Réactiver"
                pending={restore.isPending}
                onRestore={() => void run(row.id, personName(row))}
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
  );
}

function ArchivedStudents() {
  const toast = useToast();
  const students = studentsApi.useStudents({ includeArchived: true });
  const restore = studentsApi.useRestoreStudent();

  async function run(id: ID, name: string) {
    try {
      await restore.mutateAsync(id);
      toast.success(`${name} réinscrit`);
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  return (
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
              <RestoreButton
                pending={restore.isPending}
                onRestore={() => void run(row.id, `${row.firstName} ${row.lastName}`)}
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
