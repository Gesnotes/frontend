import { CalendarClock } from 'lucide-react';

import { parentApi } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { WeekScheduleGrid } from '../../components/WeekScheduleGrid';
import { useChildContext } from '../../context/child-context';
import { EmptyState, Skeleton } from '../../ui';
import { ChildRequired } from './ChildRequired';

export default function ChildSchedulePage() {
  const { child } = useChildContext();
  const schedule = parentApi.useChildSchedule(child?.id);

  return (
    <main className="parent__body">
      <header className="parent__topbar">
        <div>
          <h1 className="parent__name">Emploi du temps</h1>
          <p className="parent__greeting">
            {child ? `${child.firstName} ${child.lastName} · ${child.classe.name}` : ''}
          </p>
        </div>
      </header>

      <ChildRequired>
        <QueryBoundary query={schedule} loading={<Skeleton height={320} radius="var(--radius-lg)" />}>
          {(slots) =>
            slots.length === 0 ? (
              <EmptyState
                icon={<CalendarClock size={28} />}
                title="Aucun emploi du temps"
                description="Cette classe n'a pas encore d'horaire renseigné par l'école, ou fonctionne en présence quotidienne."
              />
            ) : (
              <WeekScheduleGrid slots={slots} />
            )
          }
        </QueryBoundary>
      </ChildRequired>
    </main>
  );
}
