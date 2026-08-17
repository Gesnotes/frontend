import { CalendarClock } from 'lucide-react';

import { scheduleApi } from '../../api';
import { WeekScheduleGrid } from '../../components/WeekScheduleGrid';
import { EmptyState, ErrorState, Skeleton } from '../../ui';

/** Mon emploi du temps : mes cours de la semaine, matière et horaire, en lecture seule. */
export default function TeacherSchedulePage() {
  const schedule = scheduleApi.useMySchedule();

  return (
    <>
      <div>
        <h1 className="tshell__page-title">Emploi du temps</h1>
        <p className="tshell__page-subtitle">Mes cours de la semaine</p>
      </div>

      {schedule.isPending ? (
        <Skeleton height={320} />
      ) : schedule.isError ? (
        <ErrorState onRetry={() => void schedule.refetch()} retrying={schedule.isRefetching} />
      ) : schedule.data.length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={28} />}
          title="Aucun cours affecté"
          description="Vous n'avez aucun créneau dans l'emploi du temps pour l'instant."
        />
      ) : (
        <WeekScheduleGrid slots={schedule.data} />
      )}
    </>
  );
}
