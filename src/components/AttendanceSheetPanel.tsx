import { useState } from 'react';

import { attendanceApi, errorMessage, type AttendanceSheetStudent, type AttendanceStatus, type ID } from '../api';
import { formatDate, plural } from '../lib/format';
import { Alert, attendanceTone, Avatar, Button, Skeleton, toneColor, useToast } from '../ui';
import { QueryBoundary } from './QueryBoundary';

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'present', label: 'Présent' },
  { value: 'late', label: 'Retard' },
  { value: 'absent', label: 'Absent' },
];

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(iso: string, delta: number): string {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + delta);
  return toIsoDay(date);
}

function effectiveStatus(student: AttendanceSheetStudent, overrides: Record<ID, AttendanceStatus>): AttendanceStatus {
  return overrides[student.id] ?? student.status ?? 'present';
}

/** « 2 présents · 1 en retard · 1 absent » : ce que l'enregistrement va faire, en une phrase. */
function summarize(students: AttendanceSheetStudent[], overrides: Record<ID, AttendanceStatus>): string {
  const values = students.map((student) => effectiveStatus(student, overrides));
  const count = (status: AttendanceStatus) => values.filter((v) => v === status).length;
  const present = count('present');
  const late = count('late');
  const absent = count('absent');

  const parts: string[] = [];
  if (present > 0) parts.push(`${present} ${plural(present, 'présent')}`);
  if (late > 0) parts.push(`${late} en retard`);
  if (absent > 0) parts.push(`${absent} ${plural(absent, 'absent')}`);
  return parts.join(' · ') || 'Aucun élève';
}

/**
 * Feuille de présence d'une classe, pour un jour : partagée entre
 * l'administration et l'enseignant référent (voir `attendance.service.ts`
 * côté backend — les deux seuls habilités à la saisir).
 *
 * « Présent » est déjà coché pour chaque élève sans saisie du jour : on ne
 * touche qu'aux absences et aux retards, jamais aux présents.
 */
export function AttendanceSheetPanel({ classId }: { classId: ID }) {
  const toast = useToast();
  const [date, setDate] = useState(() => toIsoDay(new Date()));
  const sheet = attendanceApi.useAttendanceSheet(classId, date);
  const save = attendanceApi.useSaveAttendance();

  // Les retouches de l'utilisateur, gardées à part de la donnée serveur —
  // remises à zéro quand on change de classe ou de jour (la feuille affichée
  // change alors complètement), sans passer par un effet : ajuster l'état
  // pendant le rendu évite le rendu en cascade d'un `useEffect` équivalent.
  const [sheetKey, setSheetKey] = useState(`${classId}-${date}`);
  const [overrides, setOverrides] = useState<Record<ID, AttendanceStatus>>({});
  const currentKey = `${classId}-${date}`;
  if (currentKey !== sheetKey) {
    setSheetKey(currentKey);
    setOverrides({});
  }

  const isToday = date === toIsoDay(new Date());

  async function onSave() {
    if (!sheet.data) return;
    try {
      const result = await save.mutateAsync({
        classId,
        date,
        entries: sheet.data.students.map((student) => ({
          studentId: student.id,
          status: effectiveStatus(student, overrides),
        })),
      });
      toast.success(`Présence enregistrée : ${summarize(sheet.data.students, overrides)}`);
      if (result.skipped.length > 0) {
        toast.error(`${result.skipped.length} élève(s) ne sont plus dans cette classe : non enregistré(s).`);
      }
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  return (
    <div className="page-stack" style={{ gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <Button variant="ghost" size="sm" aria-label="Jour précédent" onClick={() => setDate((d) => addDays(d, -1))}>
          ‹
        </Button>
        <span className="t-body-md" style={{ fontWeight: 600, minWidth: '14ch', textAlign: 'center' }}>
          {isToday ? "Aujourd'hui" : formatDate(date)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Jour suivant"
          disabled={isToday}
          onClick={() => setDate((d) => addDays(d, 1))}
        >
          ›
        </Button>
        {!isToday ? (
          <Button variant="secondary" size="sm" onClick={() => setDate(toIsoDay(new Date()))}>
            Revenir à aujourd'hui
          </Button>
        ) : null}
      </div>

      <QueryBoundary query={sheet} loading={<Skeleton height={220} />}>
        {(data) =>
          data.students.length === 0 ? (
            <Alert tone="info">Aucun élève inscrit dans cette classe.</Alert>
          ) : (
            <>
              <div className="list-rows">
                {data.students.map((student) => (
                  <div key={student.id} className="list-row">
                    <div className="list-row__body cell-person">
                      <Avatar name={`${student.firstName} ${student.lastName}`} size={32} />
                      <span className="list-row__title">
                        {student.firstName} {student.lastName}
                      </span>
                    </div>
                    <div className="attendance-toggle">
                      {STATUS_OPTIONS.map((option) => {
                        const active = effectiveStatus(student, overrides) === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            className="attendance-toggle__option"
                            aria-pressed={active}
                            style={active ? { background: toneColor(attendanceTone(option.value)), color: '#fff' } : undefined}
                            onClick={() =>
                              setOverrides((prev) => ({ ...prev, [student.id]: option.value }))
                            }
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)', background: 'var(--surface-container-low)',
                  borderRadius: 'var(--radius)', flexWrap: 'wrap',
                }}
              >
                <span className="t-body-md">{summarize(data.students, overrides)}</span>
                <Button loading={save.isPending} onClick={() => void onSave()}>
                  Enregistrer
                </Button>
              </div>
            </>
          )
        }
      </QueryBoundary>
    </div>
  );
}
