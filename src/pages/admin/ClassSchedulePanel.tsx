import { useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  errorMessage, scheduleApi, teachersApi,
  type ID, type TimetableSlot, type Weekday,
} from '../../api';
import { personName } from '../../lib/text';
import { paths } from '../../routes/paths';
import {
  Alert, Modal, ModalActions, SelectField, Skeleton, TextField, useToast,
} from '../../ui';

const WEEKDAYS: { id: Weekday; label: string; short: string }[] = [
  { id: 'lundi', label: 'Lundi', short: 'LUN' },
  { id: 'mardi', label: 'Mardi', short: 'MAR' },
  { id: 'mercredi', label: 'Mercredi', short: 'MER' },
  { id: 'jeudi', label: 'Jeudi', short: 'JEU' },
  { id: 'vendredi', label: 'Vendredi', short: 'VEN' },
  { id: 'samedi', label: 'Samedi', short: 'SAM' },
  { id: 'dimanche', label: 'Dimanche', short: 'DIM' },
];

const ASSIGNMENT_MIME = 'application/x-gesnotes-assignment';
const SLOT_MIME = 'application/x-gesnotes-slot';

const ROW_HEIGHT = 56; // px par heure
const SNAP_MINUTES = 15;
const DEFAULT_START_MIN = 7 * 60;
const DEFAULT_END_MIN = 18 * 60;

/** Palette catégorielle (une couleur par matière), pas la couleur de marque. */
const SUBJECT_COLORS = [
  '#2563EB', '#7C3AED', '#DB2777', '#DC2626',
  '#D97706', '#059669', '#0891B2', '#4F46E5',
];

function colorForSubject(subjectId: ID): string {
  return SUBJECT_COLORS[Math.abs(subjectId) % SUBJECT_COLORS.length]!;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

type ScheduleAssignment = {
  id: ID; // teacherAssignmentId
  subjectId: ID;
  subjectName: string;
  teacherUserId: ID;
  teacherName: string;
};

/**
 * Emploi du temps d'une classe : les matières déjà affectées à un
 * enseignant (voir la fiche enseignant) se glissent sur la grille pour leur
 * donner un horaire. Réservé aux classes en mode `notes` — le mode
 * `presence` (maternelle/garderie) n'a pas de notion de cours par matière,
 * voir CLAUDE.md et attendance.service.ts côté backend.
 *
 * Glisser-déposer natif (HTML5 DnD), sans dépendance ajoutée. Chaque puce de
 * matière reste aussi cliquable : c'est le seul chemin pour construire le
 * planning au clavier, le glisser-déposer n'étant pas accessible sans souris.
 */
export function ClassSchedulePanel({ classId }: { classId: ID }) {
  const teachers = teachersApi.useTeachers();
  const schedule = scheduleApi.useSchedule(classId);

  if (teachers.isPending || schedule.isPending) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <Skeleton height={200} />
      </div>
    );
  }

  if (teachers.isError || schedule.isError) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <Alert tone="danger">L'emploi du temps n'a pas pu être chargé.</Alert>
      </div>
    );
  }

  const assignments: ScheduleAssignment[] = (teachers.data ?? []).flatMap((teacher) =>
    teacher.affectations
      .filter((a) => a.classId === classId)
      .map((a) => ({
        id: a.id, subjectId: a.subjectId, subjectName: a.subjectName, teacherUserId: teacher.id, teacherName: personName(teacher),
      })),
  );

  return <Panel classId={classId} assignments={assignments} slots={schedule.data ?? []} />;
}

type Draft = { assignment: ScheduleAssignment; day: Weekday; startTime: string; endTime: string };

function Panel({
  classId, assignments, slots,
}: { classId: ID; assignments: ScheduleAssignment[]; slots: TimetableSlot[] }) {
  const toast = useToast();
  const createSlot = scheduleApi.useCreateSlot(classId);
  const updateSlot = scheduleApi.useUpdateSlot(classId);
  const archiveSlot = scheduleApi.useArchiveSlot(classId);

  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);

  const slotsByDay = useMemo(() => {
    const map = new Map<Weekday, TimetableSlot[]>(WEEKDAYS.map((d) => [d.id, []]));
    for (const slot of slots) map.get(slot.dayOfWeek)?.push(slot);
    return map;
  }, [slots]);

  const { gridStartMin, gridEndMin, hourMarks } = useMemo(() => {
    let start = DEFAULT_START_MIN;
    let end = DEFAULT_END_MIN;
    for (const slot of slots) {
      start = Math.min(start, toMinutes(slot.startTime));
      end = Math.max(end, toMinutes(slot.endTime));
    }
    start = Math.floor(start / 60) * 60;
    end = Math.ceil(end / 60) * 60;
    const marks: number[] = [];
    for (let m = start; m <= end; m += 60) marks.push(m);
    return { gridStartMin: start, gridEndMin: end, hourMarks: marks };
  }, [slots]);

  const gridHeight = ((gridEndMin - gridStartMin) / 60) * ROW_HEIGHT;

  function openDraftForAssignment(assignment: ScheduleAssignment, day: Weekday, startMinutes: number) {
    const start = clamp(startMinutes, gridStartMin, gridEndMin - 60);
    setDraft({
      assignment, day, startTime: toHHMM(start), endTime: toHHMM(start + 60),
    });
  }

  async function moveSlot(slot: TimetableSlot, day: Weekday, startMinutes: number) {
    setError(null);
    const duration = toMinutes(slot.endTime) - toMinutes(slot.startTime);
    const start = clamp(startMinutes, gridStartMin, gridEndMin - duration);
    try {
      await updateSlot.mutateAsync({ slotId: slot.id, dayOfWeek: day, startTime: toHHMM(start), endTime: toHHMM(start + duration) });
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  async function removeSlot(slot: TimetableSlot) {
    setError(null);
    try {
      await archiveSlot.mutateAsync(slot.id);
      toast.success(`${slot.subjectName} retirée de l'emploi du temps`);
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  return (
    <div className="flex flex-col gap-6 xl:flex-row">
      <div className="flex-1 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Emploi du temps</h2>
          <span className="text-xs font-semibold text-gray-400">
            {slots.length} créneau{slots.length > 1 ? 'x' : ''}
          </span>
        </div>

        {error ? (
          <div className="mb-4">
            <Alert tone="danger">{error}</Alert>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <div className="flex min-w-[760px]">
            <div className="w-14 shrink-0">
              <div className="h-10" />
              <div className="relative" style={{ height: gridHeight }}>
                {hourMarks.map((m) => (
                  <div
                    key={m}
                    className="absolute right-2 -translate-y-1/2 text-[11px] font-medium text-gray-400"
                    style={{ top: ((m - gridStartMin) / 60) * ROW_HEIGHT }}
                  >
                    {toHHMM(m)}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid flex-1 grid-cols-7 overflow-hidden rounded-lg border border-gray-100">
              {WEEKDAYS.map((day) => (
                <div key={day.id} className="border-r border-gray-100 last:border-r-0">
                  <div className="flex h-10 items-center justify-center border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500">
                    {day.short}
                  </div>
                  <DayColumn
                    slots={slotsByDay.get(day.id) ?? []}
                    gridStartMin={gridStartMin}
                    gridHeight={gridHeight}
                    onDropAssignmentId={(assignmentId, minutes) => {
                      const assignment = assignments.find((a) => a.id === assignmentId);
                      if (assignment) openDraftForAssignment(assignment, day.id, minutes);
                    }}
                    onDropSlotId={(slotId, minutes) => {
                      const slot = slots.find((s) => s.id === slotId);
                      if (slot) void moveSlot(slot, day.id, minutes);
                    }}
                    onEditSlot={setEditingSlot}
                    onRemoveSlot={(slot) => void removeSlot(slot)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full shrink-0 rounded-xl border border-gray-100 bg-white p-6 shadow-sm xl:w-72">
        <h3 className="mb-1 text-sm font-bold text-gray-900">Matières à placer</h3>
        <p className="mb-4 text-xs text-gray-500">
          Glissez une matière sur un horaire (ou touchez-la).
        </p>

        {assignments.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucun enseignant affecté à cette classe. Affectez un enseignant à une matière depuis{' '}
            <Link to={paths.admin.teachers} className="font-semibold text-primary">Enseignants</Link> pour
            construire l'emploi du temps.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {assignments.map((assignment) => {
              const color = colorForSubject(assignment.subjectId);
              return (
                <button
                  key={assignment.id}
                  type="button"
                  draggable
                  onDragStart={(e: DragEvent<HTMLButtonElement>) => {
                    e.dataTransfer.setData(ASSIGNMENT_MIME, String(assignment.id));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => openDraftForAssignment(assignment, WEEKDAYS[0]!.id, gridStartMin)}
                  className="flex cursor-grab items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-left hover:border-gray-400 hover:bg-gray-100"
                >
                  <GripVertical size={14} className="shrink-0 text-gray-400" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold" style={{ color }}>{assignment.subjectName}</span>
                    <span className="block truncate text-[11px] text-gray-500">{assignment.teacherName}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {draft ? (
        <SlotFormModal
          title={`${draft.assignment.subjectName} — ${draft.assignment.teacherName}`}
          day={draft.day}
          startTime={draft.startTime}
          endTime={draft.endTime}
          confirmLabel="Ajouter au planning"
          loading={createSlot.isPending}
          onClose={() => setDraft(null)}
          onConfirm={async (day, startTime, endTime) => {
            setError(null);
            try {
              await createSlot.mutateAsync({
                teacherAssignmentId: draft.assignment.id,
                dayOfWeek: day,
                startTime,
                endTime,
              });
              toast.success(`${draft.assignment.subjectName} ajoutée au planning`);
              setDraft(null);
            } catch (cause) {
              setError(errorMessage(cause));
            }
          }}
        />
      ) : null}

      {editingSlot ? (
        <SlotFormModal
          title={`${editingSlot.subjectName} — ${personName({ firstName: editingSlot.teacherFirstName, lastName: editingSlot.teacherLastName })}`}
          day={editingSlot.dayOfWeek}
          startTime={editingSlot.startTime}
          endTime={editingSlot.endTime}
          confirmLabel="Enregistrer"
          loading={updateSlot.isPending}
          onClose={() => setEditingSlot(null)}
          onConfirm={async (day, startTime, endTime) => {
            setError(null);
            try {
              await updateSlot.mutateAsync({ slotId: editingSlot.id, dayOfWeek: day, startTime, endTime });
              toast.success('Créneau modifié');
              setEditingSlot(null);
            } catch (cause) {
              setError(errorMessage(cause));
            }
          }}
        />
      ) : null}
    </div>
  );
}

function DayColumn({
  slots, gridStartMin, gridHeight, onDropAssignmentId, onDropSlotId, onEditSlot, onRemoveSlot,
}: {
  slots: TimetableSlot[];
  gridStartMin: number;
  gridHeight: number;
  onDropAssignmentId: (assignmentId: ID, startMinutes: number) => void;
  onDropSlotId: (slotId: ID, startMinutes: number) => void;
  onEditSlot: (slot: TimetableSlot) => void;
  onRemoveSlot: (slot: TimetableSlot) => void;
}) {
  const [over, setOver] = useState(false);

  function minutesFromDrop(e: DragEvent<HTMLDivElement>): number {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const raw = gridStartMin + (offsetY / ROW_HEIGHT) * 60;
    return Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES;
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const minutes = minutesFromDrop(e);
        const slotId = e.dataTransfer.getData(SLOT_MIME);
        const assignmentId = e.dataTransfer.getData(ASSIGNMENT_MIME);
        if (slotId) onDropSlotId(Number(slotId), minutes);
        else if (assignmentId) onDropAssignmentId(Number(assignmentId), minutes);
      }}
      className={`relative ${over ? 'bg-primary/5' : ''}`}
      style={{
        height: gridHeight,
        backgroundImage: 'linear-gradient(to bottom, #f3f4f6 1px, transparent 1px)',
        backgroundSize: `100% ${ROW_HEIGHT}px`,
      }}
    >
      {slots.map((slot) => {
        const top = ((toMinutes(slot.startTime) - gridStartMin) / 60) * ROW_HEIGHT;
        const height = Math.max(((toMinutes(slot.endTime) - toMinutes(slot.startTime)) / 60) * ROW_HEIGHT, 26);
        const color = colorForSubject(slot.subjectId);
        return (
          <div
            key={slot.id}
            draggable
            onDragStart={(e: DragEvent<HTMLDivElement>) => {
              e.dataTransfer.setData(SLOT_MIME, String(slot.id));
              e.dataTransfer.effectAllowed = 'move';
            }}
            className="group absolute inset-x-1 cursor-grab overflow-hidden rounded-md border-l-4 shadow-sm"
            style={{ top, height, backgroundColor: `${color}1a`, borderLeftColor: color }}
          >
            <button type="button" onClick={() => onEditSlot(slot)} className="block h-full w-full px-2 py-1 text-left">
              <div className="truncate text-[11px] font-bold text-gray-800">{slot.startTime}–{slot.endTime}</div>
              <div className="truncate text-[11px] font-semibold" style={{ color }}>{slot.subjectName}</div>
              {height >= 50 ? (
                <div className="truncate text-[10px] text-gray-500">
                  {personName({ firstName: slot.teacherFirstName, lastName: slot.teacherLastName })}
                </div>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => onRemoveSlot(slot)}
              aria-label="Retirer ce créneau"
              className="absolute right-1 top-1 hidden rounded p-0.5 text-gray-400 hover:bg-white hover:text-red-600 group-hover:block"
            >
              <Trash2 size={12} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function SlotFormModal({
  title, day, startTime, endTime, confirmLabel, loading, onClose, onConfirm,
}: {
  title: string;
  day: Weekday;
  startTime: string;
  endTime: string;
  confirmLabel: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: (day: Weekday, startTime: string, endTime: string) => void | Promise<void>;
}) {
  const [selectedDay, setSelectedDay] = useState<Weekday>(day);
  const [start, setStart] = useState(startTime);
  const [end, setEnd] = useState(endTime);
  const [localError, setLocalError] = useState<string | null>(null);

  function submit() {
    setLocalError(null);
    if (!TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) {
      setLocalError('Heures invalides.');
      return;
    }
    if (end <= start) {
      setLocalError("L'heure de fin doit venir après l'heure de début.");
      return;
    }
    void onConfirm(selectedDay, start, end);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      width={360}
      footer={<ModalActions onCancel={onClose} onConfirm={submit} confirmLabel={confirmLabel} loading={loading} />}
    >
      <div className="page-stack" style={{ gap: 'var(--space-3)' }}>
        {localError ? <Alert tone="danger">{localError}</Alert> : null}

        <SelectField
          label="Jour"
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value as Weekday)}
          options={WEEKDAYS.map((d) => ({ value: d.id, label: d.label }))}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <TextField label="Début" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          <TextField label="Fin" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
