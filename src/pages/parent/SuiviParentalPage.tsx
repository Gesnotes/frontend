import {
  CalendarClock, CalendarOff, ClipboardCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { attendanceApi, parentApi, type ChildAttendanceRecord, type TimetableSlot } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useChildContext } from '../../context/child-context';
import { formatCount, formatDate, plural } from '../../lib/format';
import { todayWeekday } from '../../lib/schedule';
import { paths } from '../../routes/paths';
import {
  Chip, EmptyState, Skeleton, attendanceTone,
} from '../../ui';
import { ChildRequired } from './ChildRequired';

const ATTENDANCE_LABELS = { present: 'Présent', late: 'Retard', absent: 'Absent' } as const;
const RECENT_LIMIT = 8;

/**
 * Suivi parental : ce qui se passe aujourd'hui, plus l'historique récent de
 * présence — inspirée de l'écran du même nom dans la maquette Flutter
 * (emploi du temps du jour + assiduité), séparée de l'accueil pour ne pas
 * y mélanger scolarité et vie quotidienne.
 */
export default function SuiviParentalPage() {
  const { child } = useChildContext();
  const schedule = parentApi.useChildSchedule(child?.id);
  const attendance = attendanceApi.useChildAttendance(child?.id);

  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col gap-6 px-4 pb-24 pt-5">
      <header>
        <h1 className="text-xl font-bold text-gray-900">Suivi parental</h1>
        <p className="text-sm text-gray-500">
          {child ? `${child.firstName} ${child.lastName} · ${child.classe.name}` : ''}
        </p>
      </header>

      <ChildRequired>
        <section>
          <div className="mb-3 flex items-baseline gap-3">
            <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
              <CalendarClock size={18} className="text-[#173bab]" aria-hidden="true" />
              Aujourd'hui
            </h2>
            <Link to={paths.parent.schedule} className="ml-auto text-sm font-semibold text-[#173bab]">
              Emploi du temps complet
            </Link>
          </div>

          <QueryBoundary query={schedule} loading={<Skeleton height={88} radius={16} />}>
            {(slots) => <TodaySchedule slots={slots} />}
          </QueryBoundary>
        </section>

        <section>
          <div className="mb-3 flex items-baseline gap-3">
            <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
              <ClipboardCheck size={18} className="text-[#173bab]" aria-hidden="true" />
              Présence
            </h2>
            <Link to={paths.parent.attendance} className="ml-auto text-sm font-semibold text-[#173bab]">
              Historique complet
            </Link>
          </div>

          <QueryBoundary query={attendance} loading={<AttendanceSkeleton />}>
            {(records) => <RecentAttendance records={records} />}
          </QueryBoundary>
        </section>
      </ChildRequired>
    </main>
  );
}

function TodaySchedule({ slots }: { slots: TimetableSlot[] }) {
  const todaySlots = [...slots]
    .filter((slot) => slot.dayOfWeek === todayWeekday())
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (todaySlots.length === 0) {
    return (
      <EmptyState
        icon={<CalendarOff size={28} />}
        title="Rien de prévu aujourd'hui"
        description="Aucun cours n'est programmé aujourd'hui pour cette classe."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {todaySlots.map((slot) => (
        <div key={slot.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-gray-900">{slot.subjectName}</span>
            <span className="block text-xs text-gray-500">{slot.startTime}–{slot.endTime}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function RecentAttendance({ records }: { records: ChildAttendanceRecord[] }) {
  if (records.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardCheck size={28} />}
        title="Aucune présence enregistrée"
        description="Le journal de présence apparaîtra ici dès la première saisie de l'école."
      />
    );
  }

  const recent = [...records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, RECENT_LIMIT);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-500">
        {formatCount(records.length)} {plural(records.length, 'jour')} enregistré{records.length > 1 ? 's' : ''} au total
      </p>
      {recent.map((record) => (
        <div key={record.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <Chip tone={attendanceTone(record.status)}>{ATTENDANCE_LABELS[record.status]}</Chip>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-gray-900">
              {formatDate(record.date)}
              {record.subjectName ? ` · ${record.subjectName}` : ''}
            </span>
            {record.comment ? <span className="block text-xs text-gray-500">{record.comment}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}

function AttendanceSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} height={64} radius={16} />
      ))}
    </div>
  );
}
