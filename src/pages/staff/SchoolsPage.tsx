import { staffApi, type SchoolWithMetrics } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { formatCount, formatDateShort, plural } from '../../lib/format';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import { DataTable, EmptyState, Skeleton, type Column } from '../../ui';

export default function SchoolsPage() {
  const schools = staffApi.useSchools();
  const list = schools.data ?? [];

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
