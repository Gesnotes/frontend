import { useState } from 'react';

import { errorMessage, staffApi, type SchoolWithMetrics } from '../../api';
import { PermanentDeleteDialog } from '../../components/PermanentDeleteDialog';
import { QueryBoundary } from '../../components/QueryBoundary';
import { formatCount, formatDateShort, plural } from '../../lib/format';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import {
  Button, Chip, ConfirmDialog, DataTable, EmptyState, Skeleton, useToast, type Column,
} from '../../ui';

export default function SchoolsPage() {
  const schools = staffApi.useSchools();
  const list = schools.data ?? [];
  const toast = useToast();

  const suspend = staffApi.useSuspendSchool();
  const restore = staffApi.useRestoreSchool();
  const remove = staffApi.useDeleteSchoolPermanently();

  const [toSuspend, setToSuspend] = useState<SchoolWithMetrics | null>(null);
  const [toDelete, setToDelete] = useState<SchoolWithMetrics | null>(null);

  async function runSuspend() {
    if (!toSuspend) return;
    try {
      await suspend.mutateAsync(toSuspend.id);
      toast.success(`« ${toSuspend.name} » suspendue`);
      setToSuspend(null);
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  async function runRestore(school: SchoolWithMetrics) {
    try {
      await restore.mutateAsync(school.id);
      toast.success(`« ${school.name} » réactivée`);
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  const columns: Column<SchoolWithMetrics>[] = [
    {
      key: 'identity',
      header: 'École',
      render: (school) => (
        <div>
          <div style={{ fontWeight: 600 }}>{school.name}</div>
          <div className="list-row__meta">
            {school.subdomain}
            {school.city ? ` · ${school.city}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (school) =>
        school.archivedAt ? <Chip tone="danger">Suspendue</Chip> : <Chip tone="success">Active</Chip>,
    },
    {
      key: 'students',
      header: 'Élèves',
      align: 'numeric',
      render: (school) => formatCount(school.students),
    },
    {
      key: 'classes',
      header: 'Classes',
      align: 'numeric',
      render: (school) => formatCount(school.classes),
    },
    {
      key: 'admins',
      header: 'Admins',
      align: 'numeric',
      render: (school) => formatCount(school.admins),
    },
    {
      key: 'teachers',
      header: 'Enseignants',
      align: 'numeric',
      render: (school) => formatCount(school.teachers),
    },
    {
      key: 'parents',
      header: 'Parents',
      align: 'numeric',
      render: (school) => formatCount(school.parents),
    },
    {
      key: 'createdAt',
      header: 'Créée',
      render: (school) => formatDateShort(school.createdAt),
    },
    {
      key: 'actions',
      srHeader: 'Actions',
      align: 'numeric',
      render: (school) =>
        school.archivedAt ? (
          <div className="cell-actions">
            <Button size="sm" variant="tonal" loading={restore.isPending} onClick={() => void runRestore(school)}>
              Réactiver
            </Button>
            <Button size="sm" variant="danger" onClick={() => setToDelete(school)}>
              Supprimer
            </Button>
          </div>
        ) : (
          <div className="cell-actions">
            <Button size="sm" variant="danger" onClick={() => setToSuspend(school)}>
              Suspendre
            </Button>
          </div>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Écoles"
        subtitle={
          schools.data
            ? `${formatCount(list.length)} ${plural(list.length, 'école')} sur la plateforme`
            : 'Toutes les écoles clientes'
        }
      />
      <PageContent>
        <QueryBoundary query={schools} loading={<TableSkeleton />}>
          {(items) => (
            <DataTable
              caption="Écoles et leurs effectifs"
              columns={columns}
              rows={items}
              rowKey={(school) => String(school.id)}
              empty={<EmptyState icon="⌂" title="Aucune école" description="Acceptez une demande d'inscription pour en créer une." />}
            />
          )}
        </QueryBoundary>
      </PageContent>

      <ConfirmDialog
        open={toSuspend !== null}
        title={`Suspendre « ${toSuspend?.name ?? ''} » ?`}
        description="Ses comptes (admin, enseignants, parents) ne pourront plus se connecter et leurs sessions en cours seront coupées. Rien n'est détruit : l'école reste réactivable à tout moment."
        confirmLabel="Suspendre"
        loading={suspend.isPending}
        onCancel={() => setToSuspend(null)}
        onConfirm={() => void runSuspend()}
      />

      <PermanentDeleteDialog
        open={toDelete !== null}
        title={`Supprimer « ${toDelete?.name ?? ''} » définitivement ?`}
        description={
          toDelete
            ? `${formatCount(toDelete.students)} ${plural(toDelete.students, 'élève')}, ${formatCount(toDelete.classes)} ${plural(toDelete.classes, 'classe')} et tous les comptes de l'école seront effacés. Cette action est irréversible.`
            : ''
        }
        confirmName={toDelete?.name}
        pending={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={async (typedLabel) => {
          if (!toDelete) return;
          await remove.mutateAsync({ id: toDelete.id, confirmLabel: typedLabel });
          toast.success(`« ${toDelete.name} » supprimée définitivement`);
          setToDelete(null);
        }}
      />
    </>
  );
}

function TableSkeleton() {
  return (
    <div className="page-stack" style={{ gap: 'var(--space-3)' }}>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} height={44} />
      ))}
    </div>
  );
}
