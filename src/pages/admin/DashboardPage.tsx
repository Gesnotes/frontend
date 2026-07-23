import { Link } from 'react-router-dom';

import { dashboardApi, type AdminDashboard, type RecentGrade } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useTermContext } from '../../context/term-context';
import { formatCount, formatGrade, formatPercent, formatRelative } from '../../lib/format';
import { personName } from '../../lib/text';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import { TermSelect } from '../../layouts/TermSelect';
import { paths } from '../../routes/paths';
import {
  Card, Chip, EmptyState, ProgressBar, SectionTitle, Skeleton, StatTile, gradeTone,
} from '../../ui';

export default function DashboardPage() {
  const { termId, term } = useTermContext();
  const dashboard = dashboardApi.useDashboard(termId);
  const recent = dashboardApi.useRecentGrades(8);

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        subtitle={term ? `Vue d'ensemble · ${term.label}` : "Vue d'ensemble de l'établissement"}
        actions={<TermSelect />}
      />
      <PageContent>
        <div className="page-stack">
          <QueryBoundary query={dashboard} loading={<StatsSkeleton />}>
            {(data) => <DashboardBody data={data} />}
          </QueryBoundary>

          <div className="grid-split">
            <Card padded>
              <SectionTitle>Dernières notes saisies</SectionTitle>
              <QueryBoundary query={recent} loading={<RowsSkeleton />}>
                {(grades) => <RecentGrades grades={grades} />}
              </QueryBoundary>
            </Card>

            <Card padded>
              <SectionTitle
                aside={<Link to={paths.admin.classes}>Toutes les classes</Link>}
              >
                Moyennes par classe
              </SectionTitle>
              <QueryBoundary query={dashboard} loading={<RowsSkeleton />}>
                {(data) => <ClassAverages data={data} />}
              </QueryBoundary>
            </Card>
          </div>
        </div>
      </PageContent>
    </>
  );
}

function DashboardBody({ data }: { data: AdminDashboard }) {
  const { effectifs, activite, saisie, moyenneEcole } = data;

  return (
    <div className="page-stack">
      <div className="grid-stats">
        <StatTile label="Élèves inscrits" value={formatCount(effectifs.eleves)} />
        <StatTile
          label="Classes"
          value={formatCount(effectifs.classes)}
          hint={`${formatCount(effectifs.enseignants)} enseignants · ${formatCount(effectifs.matieres)} matières`}
        />
        <StatTile
          label="Moyenne de l'école"
          value={formatGrade(moyenneEcole)}
          unit="/ 20"
          hint={data.periode ? data.periode.label : 'Sélectionnez une période'}
        />
        <StatTile
          label="Notes saisies (7 j.)"
          value={formatCount(activite.notesDerniers7Jours)}
          hint={`${formatCount(activite.notesTotal)} au total sur la période`}
        />
      </div>

      {saisie ? <GradingProgress saisie={saisie} /> : null}
    </div>
  );
}

/** Avancement de la saisie : le chiffre qui dit quelles classes relancer. */
function GradingProgress({ saisie }: { saisie: NonNullable<AdminDashboard['saisie']> }) {
  const late = saisie.classesSansAucuneNote;

  return (
    <Card padded>
      <SectionTitle
        aside={
          <span className="t-body-md" style={{ fontWeight: 700 }}>
            {formatPercent(saisie.taux)}
          </span>
        }
      >
        Avancement de la saisie
      </SectionTitle>

      <ProgressBar
        value={saisie.elevesEvalues}
        max={saisie.elevesTotal}
        tone={saisie.taux !== null && saisie.taux >= 85 ? 'success' : 'info'}
        label="Élèves évalués"
      />

      <p className="t-body-md t-muted" style={{ marginTop: 'var(--space-3)' }}>
        {formatCount(saisie.elevesEvalues)} élèves évalués sur {formatCount(saisie.elevesTotal)}.
      </p>

      {late.length > 0 ? (
        <div
          style={{
            marginTop: 'var(--space-3)',
            display: 'flex',
            gap: 'var(--space-2)',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <span className="t-label-sm t-muted">Aucune note :</span>
          {late.map((name) => (
            <Chip key={name} tone="warning">{name}</Chip>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function RecentGrades({ grades }: { grades: RecentGrade[] }) {
  if (grades.length === 0) {
    return (
      <EmptyState
        icon="✎"
        title="Aucune note saisie"
        description="Les notes apparaîtront ici dès que les enseignants commenceront la saisie."
      />
    );
  }

  return (
    <div className="list-rows">
      {grades.map((grade) => (
        <div key={grade.id} className="list-row">
          <Chip tone={gradeTone(grade.value, grade.maxValue)}>
            {grade.value} / {grade.maxValue}
          </Chip>
          <div className="list-row__body">
            <div className="list-row__title">
              {grade.matiere.name} · {grade.eleve.classe.name}
            </div>
            <div className="list-row__meta">
              {personName(grade.professeur, 'Enseignant retiré')} · {grade.type.label}
            </div>
          </div>
          <span className="list-row__meta">{formatRelative(grade.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}

function ClassAverages({ data }: { data: AdminDashboard }) {
  if (data.classes.length === 0) {
    return (
      <EmptyState
        icon="◫"
        title="Aucune moyenne disponible"
        description="Sélectionnez une période pour laquelle des notes ont été saisies."
      />
    );
  }

  return (
    <div className="page-stack" style={{ gap: 'var(--space-4)' }}>
      {data.classes.map((row) => (
        <div key={row.classId}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <Link to={paths.admin.classDetail(row.classId)} className="t-body-md">
              {row.className}
            </Link>
            <span className="t-body-md" style={{ fontWeight: 700 }}>
              {formatGrade(row.average)}
            </span>
          </div>
          <ProgressBar
            value={row.average ?? 0}
            max={20}
            tone={gradeTone(row.average)}
            label={`Moyenne de ${row.className}`}
          />
        </div>
      ))}
    </div>
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

function RowsSkeleton() {
  return (
    <div className="page-stack" style={{ gap: 'var(--space-4)' }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} height={40} />
      ))}
    </div>
  );
}
