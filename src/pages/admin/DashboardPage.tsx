import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  classesApi, dashboardApi, errorMessage,
  type AdminDashboard, type ID, type RecentGrade,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useTermContext } from '../../context/term-context';
import { downloadBlob, safeFilename } from '../../lib/download';
import { formatCount, formatGrade, formatPercent, formatRelative } from '../../lib/format';
import { personName } from '../../lib/text';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import { TermSelect } from '../../layouts/TermSelect';
import { paths } from '../../routes/paths';
import {
  Button, Card, Chip, EmptyState, ProgressBar, SectionTitle, Skeleton, StatTile, gradeTone,
  useToast,
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
              <p className="t-label-sm t-subtle" style={{ textTransform: 'none', marginBottom: 'var(--space-3)' }}>
                Cliquez sur une classe pour voir les matières, les notes et les rangs.
              </p>
              <QueryBoundary query={dashboard} loading={<RowsSkeleton />}>
                {(data) => <ClassAverages data={data} termId={termId} />}
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

/**
 * Moyennes par classe, chaque ligne dépliable sur son bulletin.
 *
 * L'administration voulait voir les matières, les notes et la moyenne d'une
 * classe sans quitter le tableau de bord : c'est la question qu'on se pose en
 * l'ouvrant, et il fallait deux navigations pour y répondre. Le bulletin
 * complet reste accessible d'un lien, pour le détail par catégorie.
 */
function ClassAverages({ data, termId }: { data: AdminDashboard; termId: ID | undefined }) {
  // Une seule classe ouverte à la fois : le bulletin est large, deux tableaux
  // dépliés côte à côte rendraient la carte illisible.
  const [openId, setOpenId] = useState<ID | null>(null);

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
      {data.classes.map((row) => {
        const open = openId === row.classId;
        return (
          <div key={row.classId}>
            <button
              type="button"
              className="dash-class"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : row.classId)}
            >
              <span className="dash-class__caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
              <span className="dash-class__name">{row.className}</span>
              <span className="dash-class__average">{formatGrade(row.average)}</span>
            </button>

            <ProgressBar
              value={row.average ?? 0}
              max={20}
              tone={gradeTone(row.average)}
              label={`Moyenne de ${row.className}`}
            />

            {open ? <ClassBulletinPanel classId={row.classId} termId={termId} /> : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Bulletin d'une classe, chargé seulement au dépliage.
 *
 * Le tableau de bord affiche toutes les classes de l'école : charger leurs
 * bulletins d'avance ferait autant de calculs complets que de classes, pour un
 * contenu que l'administration ne regarde qu'une classe à la fois.
 */
function ClassBulletinPanel({ classId, termId }: { classId: ID; termId: ID | undefined }) {
  const toast = useToast();
  const bulletin = classesApi.useClassBulletin(classId, termId);
  const [exporting, setExporting] = useState(false);

  async function exportCsv(className: string, termLabel: string) {
    if (termId === undefined) return;
    setExporting(true);
    try {
      const blob = await classesApi.exportClassBulletinCsv(classId, termId);
      downloadBlob(blob, `${safeFilename(className)}-${safeFilename(termLabel)}.csv`);
      toast.success('Bulletin exporté');
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="dash-bulletin">
      <QueryBoundary query={bulletin} loading={<RowsSkeleton />}>
        {(detail) => {
          // Le backend ne renvoie que les matières réellement notées, et chaque
          // élève porte la même liste : la lire sur le premier évite les
          // colonnes fantômes.
          const subjects = detail.students[0]?.subjects ?? [];

          if (subjects.length === 0) {
            return (
              <p className="t-body-md t-muted">
                Aucune note sur cette période : le bulletin apparaîtra dès les premières saisies.
              </p>
            );
          }

          return (
            <>
              <div className="dash-bulletin__scroll">
                <table className="ui-table">
                  <caption className="sr-only">
                    Bulletin de {detail.className} pour {detail.termLabel}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Élève</th>
                      {subjects.map((subject) => (
                        <th key={subject.subjectId} scope="col" className="is-center">
                          <span title={`Coefficient ${subject.coefficient}`}>
                            {subject.subjectName}
                          </span>
                        </th>
                      ))}
                      <th scope="col" className="is-center">Moyenne</th>
                      <th scope="col" className="is-numeric">Rang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.students.map((student) => (
                      <tr key={student.studentId}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {student.lastName} {student.firstName}
                        </td>
                        {subjects.map((subject) => {
                          const value = student.subjects.find(
                            (s) => s.subjectId === subject.subjectId,
                          )?.average;
                          return (
                            <td key={subject.subjectId} className="is-center">
                              <Chip tone={gradeTone(value)}>{formatGrade(value)}</Chip>
                            </td>
                          );
                        })}
                        <td className="is-center" style={{ fontWeight: 800 }}>
                          {formatGrade(student.average)}
                        </td>
                        <td className="is-numeric">{student.rang ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="dash-bulletin__actions">
                <Link to={paths.admin.classBulletin(classId)}>
                  <Button size="sm" variant="secondary">Bulletin complet</Button>
                </Link>
                <Button
                  size="sm"
                  variant="tonal"
                  loading={exporting}
                  onClick={() => void exportCsv(detail.className, detail.termLabel)}
                >
                  Exporter en CSV
                </Button>
              </div>
            </>
          );
        }}
      </QueryBoundary>
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
