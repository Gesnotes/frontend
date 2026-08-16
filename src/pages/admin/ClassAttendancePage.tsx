import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { classesApi, scheduleApi, type TimetableSlot, type Weekday } from '../../api';
import { AttendanceSheetPanel } from '../../components/AttendanceSheetPanel';
import { todayLocalIso } from '../../lib/format';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import { paths } from '../../routes/paths';
import { Alert, Button, Card, EmptyState, SectionTitle, Skeleton } from '../../ui';

const WEEKDAY_INDEX: Record<Weekday, number> = {
  dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6,
};

const WEEKDAY_LABEL: Record<Weekday, string> = {
  dimanche: 'Dimanche', lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi',
  jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi',
};

/** Prochaine date (aujourd'hui incluse) qui tombe sur ce jour de semaine. */
function nextIsoDateForWeekday(weekday: Weekday): string {
  const today = todayLocalIso();
  const current = new Date(today).getUTCDay();
  const delta = (WEEKDAY_INDEX[weekday] - current + 7) % 7;
  const target = new Date(today);
  target.setUTCDate(target.getUTCDate() + delta);
  return target.toISOString().slice(0, 10);
}

export default function ClassAttendancePage() {
  const { classId } = useParams();
  const id = Number(classId);

  // Pas de période à demander ici : la présence n'a pas de « moyenne », un
  // jour se suffit à lui-même — contrairement au détail de classe.
  const classes = classesApi.useClasses();
  const klass = classes.data?.find((item) => item.id === id);

  return (
    <>
      <PageHeader
        title={klass?.name ?? 'Présence'}
        subtitle={klass ? `Niveau ${klass.level}` : 'Feuille de présence'}
        back={
          <Link to={paths.admin.classes}>
            <Button variant="ghost" aria-label="Retour aux classes">‹</Button>
          </Link>
        }
      />
      <PageContent>
        {!Number.isFinite(id) ? null : klass?.mode === 'notes' ? (
          <ClassScheduleAttendance classId={id} />
        ) : (
          <AttendanceSheetPanel classId={id} />
        )}
      </PageContent>
    </>
  );
}

/**
 * Classes mode `notes` : pas d'appel unique, chaque créneau a le sien.
 * L'administration choisit d'abord sur quel créneau saisir — n'importe quel
 * jour de la semaine, pas seulement aujourd'hui, pour pouvoir rattraper une
 * saisie oubliée.
 */
function ClassScheduleAttendance({ classId }: { classId: number }) {
  const schedule = scheduleApi.useSchedule(classId);
  const [picked, setPicked] = useState<TimetableSlot | null>(null);

  if (schedule.isPending) {
    return (
      <Card padded>
        <Skeleton height={160} />
      </Card>
    );
  }

  if (schedule.isError) {
    return (
      <Card padded>
        <Alert tone="danger">L'emploi du temps n'a pas pu être chargé.</Alert>
      </Card>
    );
  }

  if (picked) {
    return (
      <div className="page-stack">
        <Button variant="ghost" size="sm" onClick={() => setPicked(null)}>
          ‹ Changer de créneau
        </Button>
        <AttendanceSheetPanel slotId={picked.id} initialDate={nextIsoDateForWeekday(picked.dayOfWeek)} />
      </div>
    );
  }

  const slots = schedule.data ?? [];

  return (
    <Card padded>
      <SectionTitle>Sur quel créneau saisir la présence ?</SectionTitle>
      {slots.length === 0 ? (
        <EmptyState
          icon="◔"
          title="Aucun créneau"
          description="Cette classe utilise l'appel par créneau, mais son emploi du temps est encore vide. Renseignez-le depuis la fiche de la classe."
        />
      ) : (
        <div className="list-rows">
          {slots.map((slot) => (
            <button key={slot.id} type="button" className="list-row" onClick={() => setPicked(slot)}>
              <div className="list-row__body">
                <div className="list-row__title">{slot.subjectName}</div>
                <div className="list-row__meta">
                  {WEEKDAY_LABEL[slot.dayOfWeek]} {slot.startTime}–{slot.endTime} ·{' '}
                  {[slot.teacherFirstName, slot.teacherLastName].filter(Boolean).join(' ')}
                </div>
              </div>
              <span aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
