import { CalendarClock, NotebookPen } from 'lucide-react';
import { Link } from 'react-router-dom';

import { gradesApi, scheduleApi, type ID, type TeacherClassAssignment, type TimetableSlot } from '../../api';
import { useAuth } from '../../auth/auth-context';
import { useTermContext } from '../../context/term-context';
import { formatCount, plural, todayLocalIso } from '../../lib/format';
import { paths } from '../../routes/paths';
import { Alert, Card, EmptyState, ErrorState, Skeleton } from '../../ui';

/**
 * Accueil enseignant : ce qui compte en arrivant sur l'app — les cours du
 * jour (avec l'entrée directe vers l'appel) et l'avancement de la saisie.
 * Pas de nouvel agrégat backend : tout vient de `useMySchedule` et
 * `useMyClasses`, déjà utilisés par « Présence » et « Saisie ».
 */
export default function TeacherDashboardPage() {
  const { displayName } = useAuth();
  const { termId, term } = useTermContext();
  const today = todayLocalIso();
  const schedule = scheduleApi.useMySchedule(today);
  const assignments = gradesApi.useMyClasses(termId);

  return (
    <>
      <div>
        <h1 className="tshell__page-title">Bonjour, {displayName}</h1>
        <p className="tshell__page-subtitle">{term ? term.label : 'Tableau de bord'}</p>
      </div>

      <TodaySection schedule={schedule} />
      <SummarySection assignments={assignments} />
      <GradingSection assignments={assignments} termId={termId} />
    </>
  );
}

function TodaySection({ schedule }: { schedule: ReturnType<typeof scheduleApi.useMySchedule> }) {
  return (
    <section>
      <h2 className="parent__section-title" style={{ marginBottom: 'var(--space-3)' }}>
        Aujourd'hui
      </h2>

      {schedule.isPending ? (
        <Skeleton height={72} radius="var(--radius-lg)" />
      ) : schedule.isError ? (
        <ErrorState onRetry={() => void schedule.refetch()} retrying={schedule.isRefetching} />
      ) : schedule.data.length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={28} />}
          title="Aucun cours aujourd'hui"
          description="Rien de prévu dans votre emploi du temps pour aujourd'hui."
        />
      ) : (
        <div className="tcards">
          {schedule.data.map((slot: TimetableSlot) => (
            <Link key={slot.id} to={`${paths.teacher.attendance}?creneau=${slot.id}`} className="tpick">
              <span className="tpick__body">
                <span className="tpick__title">{slot.className} · {slot.subjectName}</span>
                <span className="tpick__meta">{slot.startTime}–{slot.endTime} · faire l'appel</span>
              </span>
              <span className="tpick__chevron" aria-hidden="true">›</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function SummarySection({ assignments }: { assignments: ReturnType<typeof gradesApi.useMyClasses> }) {
  if (!assignments.data || assignments.data.length === 0) return null;

  const classCount = new Set(assignments.data.map((a) => a.classId)).size;
  const studentCount = Array.from(
    new Map(assignments.data.map((a) => [a.classId, a.effectif])).values(),
  ).reduce((sum, effectif) => sum + effectif, 0);

  return (
    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
      <Card padded style={{ flex: 1 }}>
        <div className="t-label-sm t-subtle" style={{ textTransform: 'none' }}>Classes</div>
        <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{formatCount(classCount)}</div>
      </Card>
      <Card padded style={{ flex: 1 }}>
        <div className="t-label-sm t-subtle" style={{ textTransform: 'none' }}>Élèves</div>
        <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{formatCount(studentCount)}</div>
      </Card>
    </div>
  );
}

function GradingSection({
  assignments, termId,
}: { assignments: ReturnType<typeof gradesApi.useMyClasses>; termId: ID | undefined }) {
  return (
    <section>
      <h2 className="parent__section-title" style={{ marginBottom: 'var(--space-3)' }}>
        Avancement de la saisie
      </h2>

      {termId === undefined ? (
        <Alert tone="info">
          Aucune période active. Votre administration doit d'abord ouvrir une période pour permettre la saisie.
        </Alert>
      ) : assignments.isPending ? (
        <Skeleton height={72} radius="var(--radius-lg)" />
      ) : assignments.isError ? (
        <ErrorState onRetry={() => void assignments.refetch()} retrying={assignments.isRefetching} />
      ) : assignments.data.length === 0 ? (
        <EmptyState
          icon={<NotebookPen size={28} />}
          title="Aucune classe affectée"
          description="Sans affectation classe × matière, la saisie de notes n'est pas autorisée."
        />
      ) : (
        <RankedAssignments assignments={assignments.data} />
      )}
    </section>
  );
}

const MAX_ROWS = 5;

function RankedAssignments({ assignments }: { assignments: TeacherClassAssignment[] }) {
  const sorted = [...assignments].sort((a, b) => {
    const ratioA = a.effectif === 0 ? 1 : a.evalues / a.effectif;
    const ratioB = b.effectif === 0 ? 1 : b.evalues / b.effectif;
    return ratioA - ratioB;
  });
  const shown = sorted.slice(0, MAX_ROWS);

  return (
    <div className="tcards">
      {shown.map((item) => (
        <Link
          key={item.assignmentId}
          to={`${paths.teacher.gradeEntry}?classe=${item.classId}&matiere=${item.subjectId}`}
          className="tpick"
        >
          <span className="tpick__body">
            <span className="tpick__title">{item.className} · {item.subjectName}</span>
            <span className="tpick__meta">
              {item.effectif === 0
                ? 'Aucun élève inscrit'
                : `${formatCount(item.evalues)}/${formatCount(item.effectif)} ${plural(item.effectif, 'élève')} noté${item.evalues > 1 ? 's' : ''}`}
            </span>
          </span>
          <span className="tpick__chevron" aria-hidden="true">›</span>
        </Link>
      ))}
      {sorted.length > MAX_ROWS ? (
        <Link to={paths.teacher.gradeEntry} className="t-body-md" style={{ textAlign: 'center' }}>
          Voir toutes les classes ({formatCount(sorted.length)})
        </Link>
      ) : null}
    </div>
  );
}
