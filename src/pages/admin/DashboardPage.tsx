import { useState } from 'react';
import { Link } from 'react-router-dom';

import { dashboardApi, type AdminDashboard, type ID, type RecentGrade } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useTermContext } from '../../context/term-context';
import { formatCount, formatGrade, formatPercent, formatRelative } from '../../lib/format';
import { personName } from '../../lib/text';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import { TermSelect } from '../../layouts/TermSelect';
import { paths } from '../../routes/paths';
import {
  Button, Card, Chip, EmptyState, ProgressBar, SectionTitle, Skeleton, StatTile, gradeTone,
} from '../../ui';
import { ClassBulletinPanel } from './ClassBulletinPanel';

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
        <QueryBoundary query={dashboard} loading={<StatsSkeleton />}>
          {(data) =>
            isSetupIncomplete(data.effectifs) ? (
              <OnboardingChecklist effectifs={data.effectifs} />
            ) : (
              <div className="page-stack">
                <DashboardBody data={data} />

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
                    <ClassAverages data={data} termId={termId} />
                  </Card>
                </div>
              </div>
            )
          }
        </QueryBoundary>
      </PageContent>
    </>
  );
}

/**
 * Liste de tâches d'accueil (DESIGN.md §6) : remplace un tableau de bord
 * vide à la première connexion, plutôt que d'afficher des moyennes et des
 * effectifs à zéro qui n'apprennent rien à l'administration.
 */
function isSetupIncomplete(effectifs: AdminDashboard['effectifs']): boolean {
  return effectifs.classes === 0 || effectifs.enseignants === 0 || effectifs.eleves === 0;
}

function OnboardingChecklist({ effectifs }: { effectifs: AdminDashboard['effectifs'] }) {
  const steps = [
    {
      done: effectifs.classes > 0,
      label: 'Ajouter vos classes, avec leur mode (notes ou présence)',
      cta: 'Commencer par les classes',
      to: paths.admin.classes,
    },
    {
      done: effectifs.enseignants > 0,
      label: 'Inviter vos enseignants',
      cta: 'Inviter vos enseignants',
      to: paths.admin.teachers,
    },
    {
      done: effectifs.eleves > 0,
      label: 'Importer la liste de vos élèves',
      cta: 'Importer vos élèves',
      to: paths.admin.students,
    },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done) ?? steps[0]!;

  return (
    <Card padded>
      <SectionTitle>Bienvenue, configurons votre école</SectionTitle>
      <p className="t-body-md t-muted" style={{ marginBottom: 'var(--space-4)' }}>
        {doneCount} sur {steps.length} terminé
      </p>

      <div className="checklist">
        {steps.map((step) => (
          <div key={step.label} className={`checklist__row${step.done ? ' is-done' : ''}`}>
            <span className="checklist__box" aria-hidden="true">{step.done ? '✓' : ''}</span>
            {step.label}
          </div>
        ))}
      </div>

      <Link to={next.to}>
        <Button variant="primary">{next.cta}</Button>
      </Link>
    </Card>
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
