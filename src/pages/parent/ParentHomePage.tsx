import { ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  attendanceApi, parentApi, type ChildDetail, type ChildSummary, type ID, type ParentGrade, type TimetableSlot,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useAuth } from '../../auth/auth-context';
import { useChildContext } from '../../context/child-context';
import { useTermContext } from '../../context/term-context';
import { formatCount, formatDate, formatGrade, formatRelative, plural } from '../../lib/format';
import { todayWeekday } from '../../lib/schedule';
import { InstallCard } from '../../pwa/InstallCard';
import { paths } from '../../routes/paths';
import {
  attendanceTone, Card, Chip, EmptyState, Skeleton, gradeTone, toneColor,
} from '../../ui';
import { ChildRequired } from './ChildRequired';
import { TermPicker } from './TermPicker';

const ATTENDANCE_LABELS = { present: 'Présent', late: 'Retard', absent: 'Absent' } as const;

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

        <TodaySection childId={child?.id} />

        <QueryBoundary query={detail} loading={<HomeSkeleton />}>
          {(data) => <ChildOverview data={data} termLabel={term?.label} />}
        </QueryBoundary>

        <RecentGradesSection childId={child?.id} termId={termId} />
      </ChildRequired>
    </main>
  );
}

/**
 * Ce qui se passe aujourd'hui : cours du jour + dernier statut de présence.
 * Requêtes indépendantes de `useChildDetail` (bulletin de la période) — un
 * bulletin lent ne doit pas retarder l'affichage du planning du jour.
 */
function TodaySection({ childId }: { childId: ID | undefined }) {
  const schedule = parentApi.useChildSchedule(childId);
  const attendance = attendanceApi.useChildAttendance(childId);

  if (schedule.isPending || attendance.isPending) {
    return <Skeleton height={88} radius="var(--radius-lg)" />;
  }
  if (schedule.isError || attendance.isError) return null;

  const todaySlots = [...(schedule.data ?? [])]
    .filter((slot) => slot.dayOfWeek === todayWeekday())
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const lastAttendance = [...(attendance.data ?? [])].sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <section>
      <div className="parent__section-head">
        <h2 className="parent__section-title">Aujourd'hui</h2>
        <Link to={paths.parent.schedule} style={{ marginLeft: 'auto' }}>Emploi du temps</Link>
      </div>

      {todaySlots.length === 0 ? (
        <p className="t-body-md t-muted">Rien de prévu aujourd'hui.</p>
      ) : (
        <div className="parent__cards">
          {todaySlots.map((slot: TimetableSlot) => (
            <div key={slot.id} className="ui-card parent__row">
              <span className="parent__row-body">
                <span className="parent__row-title">{slot.subjectName}</span>
                <span className="parent__row-meta">{slot.startTime}–{slot.endTime}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {lastAttendance ? (
        <p className="t-body-md t-muted" style={{ marginTop: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          Dernière présence :
          <Chip tone={attendanceTone(lastAttendance.status)}>{ATTENDANCE_LABELS[lastAttendance.status]}</Chip>
          le {formatDate(lastAttendance.date)}
        </p>
      ) : null}
    </section>
  );
}

/** Fil des dernières notes de la période, tous statuts confondus — le complément du détail par matière. */
function RecentGradesSection({ childId, termId }: { childId: ID | undefined; termId: ID | undefined }) {
  const grades = parentApi.useChildGrades(childId, { termId });

  if (grades.isPending) return <Skeleton height={88} radius="var(--radius-lg)" />;
  if (grades.isError || !grades.data || grades.data.length === 0) return null;

  const recent = [...grades.data]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, 3);

  return (
    <section>
      <h2 className="parent__section-title" style={{ marginBottom: 'var(--space-3)' }}>Dernières notes</h2>
      <div className="parent__cards">
        {recent.map((grade: ParentGrade) => (
          <Link
            key={grade.id}
            to={paths.parent.grade(grade.id)}
            className="ui-card ui-card--interactive parent__row"
            style={{ color: 'inherit' }}
          >
            <Chip tone={gradeTone(grade.value, grade.maxValue)}>{grade.value}/{grade.maxValue}</Chip>
            <span className="parent__row-body">
              <span className="parent__row-title">{grade.matiere.name}</span>
              <span className="parent__row-meta">{grade.type.label} · {formatRelative(grade.createdAt)}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
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
