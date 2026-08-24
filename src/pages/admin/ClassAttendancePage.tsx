import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  attendanceApi, classesApi, scheduleApi, type ClassAttendanceSummaryRow, type ID,
  type TimetableSlot, type Weekday,
} from '../../api';
import { AttendanceSheetPanel } from '../../components/AttendanceSheetPanel';
import { useTermContext } from '../../context/term-context';
import { formatCount, plural, todayLocalIso } from '../../lib/format';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import { TermSelect } from '../../layouts/TermSelect';
import { paths } from '../../routes/paths';
import {
  Alert, Button, Card, DataTable, EmptyState, SectionTitle, Skeleton, Tabs, type Column,
} from '../../ui';
import { TermRequired } from './TermRequired';

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

const VIEW_TABS = [
  { key: 'jour', label: 'Aujourd’hui' },
  { key: 'recap', label: 'Récap de la période' },
];

export default function ClassAttendancePage() {
  const { classId } = useParams();
  const id = Number(classId);
  const [view, setView] = useState('jour');

  // Pas de période à demander pour la saisie du jour : la présence n'a pas
  // de « moyenne », un jour se suffit à lui-même — contrairement au récap,
  // qui a besoin d'une période pour borner ce qu'il additionne.
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
        {!Number.isFinite(id) ? null : (
          <div className="page-stack" style={{ gap: 'var(--space-4)' }}>
            <Tabs items={VIEW_TABS} activeKey={view} onChange={setView} />

            {view === 'jour' ? (
              klass?.mode === 'notes' ? (
                <ClassScheduleAttendance classId={id} />
              ) : (
                <AttendanceSheetPanel classId={id} />
              )
            ) : (
              <TermRequired>
                <ClassAttendanceRecap classId={id} />
              </TermRequired>
            )}
          </div>
        )}
      </PageContent>
    </>
  );
}

/**
 * Récap de présence de la classe sur la période sélectionnée : compteurs par
 * élève, pour repérer vite qui pose problème sans ouvrir chaque fiche. Un
 * clic sur une ligne ouvre le détail (l'historique complet) de l'élève.
 */
function ClassAttendanceRecap({ classId }: { classId: ID }) {
  const navigate = useNavigate();
  const { termId, term } = useTermContext();
  const summary = attendanceApi.useClassAttendanceSummary(classId, termId);

  const columns: Column<ClassAttendanceSummaryRow>[] = [
    { key: 'eleve', header: 'Élève', render: (row) => `${row.firstName} ${row.lastName}` },
    { key: 'present', header: 'Présent', align: 'numeric', render: (row) => formatCount(row.present) },
    { key: 'late', header: 'Retard', align: 'numeric', render: (row) => formatCount(row.late) },
    { key: 'absent', header: 'Absent', align: 'numeric', render: (row) => formatCount(row.absent) },
    {
      key: 'recorded',
      header: 'Total saisi',
      align: 'numeric',
      render: (row) => `${formatCount(row.recorded)} ${plural(row.recorded, 'jour')}`,
    },
    {
      key: 'fiche',
      srHeader: 'Voir la fiche élève',
      align: 'center',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(paths.admin.studentDetail(row.studentId))}
        >
          Fiche ›
        </Button>
      ),
    },
  ];

  // Ceux qui posent le plus problème en tête : le récap sert à les repérer
  // vite, pas à relire la classe dans l'ordre alphabétique.
  const rows = [...(summary.data?.students ?? [])].sort((a, b) => {
    const trouble = (row: ClassAttendanceSummaryRow) => row.absent + row.late;
    return trouble(b) - trouble(a) || a.lastName.localeCompare(b.lastName, 'fr');
  });

  return (
    <div className="page-stack" style={{ gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <span className="t-body-sm t-muted">{term ? term.label : 'Sélectionnez une période'}</span>
        <TermSelect />
      </div>

      {summary.isError ? (
        <Alert tone="danger">Le récap n'a pas pu être chargé.</Alert>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => String(row.studentId)}
          loading={summary.isPending}
          caption={`Récap de présence de ${term?.label ?? 'la période'}`}
          empty={
            <EmptyState
              icon="◔"
              title="Aucun élève"
              description="Cette classe n'a pas encore d'élève inscrit."
            />
          }
        />
      )}
    </div>
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
