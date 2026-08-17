import { ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';

import { parentApi, type ChildDetail, type ChildSummary } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useAuth } from '../../auth/auth-context';
import { useChildContext } from '../../context/child-context';
import { useTermContext } from '../../context/term-context';
import { formatCount, formatGrade, plural } from '../../lib/format';
import { InstallCard } from '../../pwa/InstallCard';
import { paths } from '../../routes/paths';
import { Card, Chip, EmptyState, Skeleton, gradeTone, toneColor } from '../../ui';
import { ChildRequired } from './ChildRequired';
import { TermPicker } from './TermPicker';

export default function ParentHomePage() {
  const { displayName } = useAuth();
  const { termId, term } = useTermContext();
  const { child, children } = useChildContext();

  const detail = parentApi.useChildDetail(child?.id, termId);

  return (
    <main className="parent__body">
      <header className="parent__topbar">
        <div>
          <p className="parent__greeting">Bonjour,</p>
          {/* Titre de niveau 1 de l'écran d'accueil : chaque page doit en
              porter un, et c'est bien ce libellé qui la nomme. */}
          <h1 className="parent__name">{displayName}</h1>
        </div>
        {children.length > 1 ? (
          <Link to={paths.parent.children} style={{ marginLeft: 'auto' }}>
            <Chip tone="info">Changer d'enfant</Chip>
          </Link>
        ) : null}
      </header>

      <InstallCard compact />

      <ChildRequired>
        <ChildBanner child={child} />
        <TermPicker />

        <QueryBoundary query={detail} loading={<HomeSkeleton />}>
          {(data) => <ChildOverview data={data} termLabel={term?.label} />}
        </QueryBoundary>
      </ChildRequired>
    </main>
  );
}

function ChildBanner({ child }: { child: ChildSummary | undefined }) {
  if (!child) return null;
  return (
    <p className="t-body-md t-muted" style={{ marginTop: 'calc(var(--space-8) * -1 + var(--space-3))' }}>
      {child.firstName} {child.lastName} · {child.classe.name}
    </p>
  );
}

function ChildOverview({ data, termLabel }: { data: ChildDetail; termLabel: string | undefined }) {
  const noted = data.subjects.filter((subject) => subject.average !== null);

  return (
    <>
      <section className="parent__hero">
        <p className="parent__hero-label">Moyenne générale · {termLabel ?? data.termLabel}</p>
        <div className="parent__hero-value">
          <span className="parent__hero-number">{formatGrade(data.average)}</span>
          <span className="parent__hero-max">/ 20</span>
        </div>
        <span className="parent__hero-delta">
          {noted.length === 0
            ? 'Aucune note sur cette période'
            : `${formatCount(noted.length)} ${plural(noted.length, 'matière')} notée${noted.length > 1 ? 's' : ''}`}
        </span>
      </section>

      <section>
        <div className="parent__section-head">
          <h2 className="parent__section-title">Par matière</h2>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-3)' }}>
            <Link to={paths.parent.attendance}>Présence</Link>
            <Link to={paths.parent.grades}>Toutes les notes</Link>
          </span>
        </div>

        {data.subjects.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={28} />}
            title="Aucune note pour l'instant"
            description="Les notes apparaîtront ici dès que les enseignants les auront saisies pour cette période."
          />
        ) : (
          <div className="parent__cards">
            {data.subjects.map((subject) => {
              const tone = gradeTone(subject.average);
              return (
                <Link
                  key={subject.subjectId}
                  to={paths.parent.child(data.studentId)}
                  className="ui-card ui-card--interactive parent__row"
                  style={{ color: 'inherit' }}
                >
                  <span
                    className="parent__row-badge"
                    style={{
                      background: `color-mix(in srgb, ${toneColor(tone)} 14%, transparent)`,
                      color: toneColor(tone),
                    }}
                  >
                    {subject.average === null ? '—' : Math.round(subject.average)}
                  </span>
                  <span className="parent__row-body">
                    <span className="parent__row-title">{subject.subjectName}</span>
                    <span className="parent__row-meta">Coefficient {subject.coefficient}</span>
                  </span>
                  <Chip tone={tone}>{formatGrade(subject.average)}</Chip>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

function HomeSkeleton() {
  return (
    <>
      <Skeleton height={150} radius="var(--radius-xl)" />
      <div className="parent__cards">
        {[0, 1, 2].map((i) => (
          <Card key={i} padded>
            <Skeleton height={44} />
          </Card>
        ))}
      </div>
    </>
  );
}
