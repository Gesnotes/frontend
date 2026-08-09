import { staffApi } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { formatCount } from '../../lib/format';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import { Card, SectionTitle, Skeleton, StatTile } from '../../ui';

export default function StaffDashboardPage() {
  const overview = staffApi.useOverview();

  return (
    <>
      <PageHeader title="Vue d'ensemble" subtitle="Toute la plateforme, tous établissements confondus" />
      <PageContent>
        <QueryBoundary query={overview} loading={<StatsSkeleton />}>
          {(data) => (
            <div className="page-stack">
              <div className="grid-stats">
                <StatTile label="Écoles" value={formatCount(data.schools)} />
                <StatTile label="Élèves inscrits" value={formatCount(data.students)} />
                <StatTile label="Classes" value={formatCount(data.classes)} />
                <StatTile label="Demandes en attente" value={formatCount(data.pendingSignupRequests)} />
              </div>

              <Card padded>
                <SectionTitle>Comptes actifs</SectionTitle>
                <div className="grid-stats">
                  <StatTile label="Administrateurs" value={formatCount(data.users.admin)} />
                  <StatTile label="Enseignants" value={formatCount(data.users.teacher)} />
                  <StatTile label="Parents" value={formatCount(data.users.parent)} />
                  <StatTile label="Total" value={formatCount(data.users.total)} />
                </div>
              </Card>
            </div>
          )}
        </QueryBoundary>
      </PageContent>
    </>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid-stats">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} padded>
          <Skeleton width="60%" height={12} />
          <Skeleton width="45%" height={28} style={{ marginTop: 14 }} />
        </Card>
      ))}
    </div>
  );
}
