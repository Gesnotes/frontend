import { useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { Link } from 'react-router-dom';

import {
  errorMessage, scheduleApi, teachersApi,
  type ID, type TimetableSlot, type Weekday,
} from '../../api';
import { personName } from '../../lib/text';
import { paths } from '../../routes/paths';
import {
  Alert, Card, Chip, Modal, ModalActions, SectionTitle, SelectField, Skeleton, TextField, useToast,
} from '../../ui';

const WEEKDAYS: { id: Weekday; label: string }[] = [
  { id: 'lundi', label: 'Lundi' },
  { id: 'mardi', label: 'Mardi' },
  { id: 'mercredi', label: 'Mercredi' },
  { id: 'jeudi', label: 'Jeudi' },
  { id: 'vendredi', label: 'Vendredi' },
  { id: 'samedi', label: 'Samedi' },
  { id: 'dimanche', label: 'Dimanche' },
];

const ASSIGNMENT_MIME = 'application/x-gesnotes-assignment';
const SLOT_MIME = 'application/x-gesnotes-slot';

type ScheduleAssignment = {
  id: ID; // teacherAssignmentId
  subjectName: string;
  teacherUserId: ID;
  teacherName: string;
};

/**
 * Emploi du temps d'une classe : les matières déjà affectées à un
 * enseignant (voir la fiche enseignant) se glissent sur un jour pour leur
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
      <Card padded>
        <SectionTitle>Emploi du temps</SectionTitle>
        <Skeleton height={200} />
      </Card>
    );
  }

  if (teachers.isError || schedule.isError) {
    return (
      <Card padded>
        <SectionTitle>Emploi du temps</SectionTitle>
        <Alert tone="danger">L'emploi du temps n'a pas pu être chargé.</Alert>
      </Card>
    );
  }

  const assignments: ScheduleAssignment[] = (teachers.data ?? []).flatMap((teacher) =>
    teacher.affectations
      .filter((a) => a.classId === classId)
      .map((a) => ({ id: a.id, subjectName: a.subjectName, teacherUserId: teacher.id, teacherName: personName(teacher) })),
  );

  return <Panel classId={classId} assignments={assignments} slots={schedule.data ?? []} />;
}

function Panel({
  classId, assignments, slots,
}: { classId: ID; assignments: ScheduleAssignment[]; slots: TimetableSlot[] }) {
  const toast = useToast();
  const createSlot = scheduleApi.useCreateSlot(classId);
  const updateSlot = scheduleApi.useUpdateSlot(classId);
  const archiveSlot = scheduleApi.useArchiveSlot(classId);

  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ assignment: ScheduleAssignment; day: Weekday } | null>(null);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);

  const slotsByDay = useMemo(() => {
    const map = new Map<Weekday, TimetableSlot[]>(WEEKDAYS.map((d) => [d.id, []]));
    for (const slot of slots) map.get(slot.dayOfWeek)?.push(slot);
    for (const list of map.values()) list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return map;
  }, [slots]);

  async function moveSlot(slotId: ID, day: Weekday) {
    setError(null);
    try {
      await updateSlot.mutateAsync({ slotId, dayOfWeek: day });
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
    <Card padded>
      <SectionTitle
        aside={
          <span className="t-label-sm t-subtle" style={{ textTransform: 'none' }}>
            {slots.length} créneau{slots.length > 1 ? 'x' : ''}
          </span>
        }
      >
        Emploi du temps
      </SectionTitle>

      {error ? (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}

      {assignments.length === 0 ? (
        <p className="t-body-md t-muted">
          Aucun enseignant affecté à cette classe. Affectez un enseignant à une matière depuis{' '}
          <Link to={paths.admin.teachers}>Enseignants</Link> pour construire l'emploi du temps.
        </p>
      ) : (
        <>
          <p className="t-label-sm t-subtle" style={{ textTransform: 'none', marginBottom: 'var(--space-2)' }}>
            Glissez une matière sur un jour (ou touchez-la) pour lui donner un horaire.
          </p>
          <div
            style={{
              display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)',
            }}
          >
            {assignments.map((assignment) => (
              <button
                key={assignment.id}
                type="button"
                className="ui-btn ui-btn--ghost"
                style={{ padding: 0, border: 'none', background: 'none', cursor: 'grab' }}
                draggable
                onDragStart={(e: DragEvent<HTMLButtonElement>) => {
                  e.dataTransfer.setData(ASSIGNMENT_MIME, String(assignment.id));
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => setDraft({ assignment, day: WEEKDAYS[0]!.id })}
              >
                <Chip tone="info">{assignment.subjectName} — {assignment.teacherName}</Chip>
              </button>
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-3)', overflowX: 'auto', paddingBottom: 'var(--space-2)' }}>
        {WEEKDAYS.map((day) => (
          <DayColumn
            key={day.id}
            day={day}
            slots={slotsByDay.get(day.id) ?? []}
            onDropAssignmentId={(assignmentId) => {
              const assignment = assignments.find((a) => a.id === assignmentId);
              if (assignment) setDraft({ assignment, day: day.id });
            }}
            onDropSlotId={(slotId) => void moveSlot(slotId, day.id)}
            onEditSlot={setEditingSlot}
            onRemoveSlot={(slot) => void removeSlot(slot)}
          />
        ))}
      </div>

      {draft ? (
        <SlotFormModal
          title={`${draft.assignment.subjectName} — ${draft.assignment.teacherName}`}
          day={draft.day}
          startTime="08:00"
          endTime="09:00"
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
    </Card>
  );
}

function DayColumn({
  day, slots, onDropAssignmentId, onDropSlotId, onEditSlot, onRemoveSlot,
}: {
  day: { id: Weekday; label: string };
  slots: TimetableSlot[];
  onDropAssignmentId: (assignmentId: ID) => void;
  onDropSlotId: (slotId: ID) => void;
  onEditSlot: (slot: TimetableSlot) => void;
  onRemoveSlot: (slot: TimetableSlot) => void;
}) {
  const [over, setOver] = useState(false);

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
        const slotId = e.dataTransfer.getData(SLOT_MIME);
        const assignmentId = e.dataTransfer.getData(ASSIGNMENT_MIME);
        if (slotId) onDropSlotId(Number(slotId));
        else if (assignmentId) onDropAssignmentId(Number(assignmentId));
      }}
      style={{
        flex: '0 0 170px',
        minHeight: 160,
        borderRadius: 'var(--radius-md)',
        border: `1px dashed ${over ? 'var(--primary)' : 'var(--surface-container-high)'}`,
        background: over ? 'var(--surface-container)' : 'var(--surface-container-low)',
        padding: 'var(--space-2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
      }}
    >
      <div className="t-label-sm t-subtle" style={{ textTransform: 'none', fontWeight: 700 }}>
        {day.label}
      </div>

      {slots.length === 0 ? (
        <div className="t-body-sm t-muted" style={{ fontSize: 12 }}>—</div>
      ) : (
        slots.map((slot) => (
          <div
            key={slot.id}
            draggable
            onDragStart={(e: DragEvent<HTMLDivElement>) => {
              e.dataTransfer.setData(SLOT_MIME, String(slot.id));
              e.dataTransfer.effectAllowed = 'move';
            }}
            style={{
              background: 'var(--surface-container-lowest)',
              border: '1px solid var(--surface-container-high)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-2)',
              fontSize: 12,
              cursor: 'grab',
            }}
          >
            <button
              type="button"
              onClick={() => onEditSlot(slot)}
              style={{
                all: 'unset', display: 'block', width: '100%', cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 600 }}>{slot.startTime}–{slot.endTime}</div>
              <div className="t-muted">{slot.subjectName}</div>
              <div className="t-muted" style={{ fontSize: 11 }}>
                {personName({ firstName: slot.teacherFirstName, lastName: slot.teacherLastName })}
              </div>
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--ghost ui-btn--sm"
              style={{ marginTop: 4, padding: '2px 6px', fontSize: 11 }}
              onClick={() => onRemoveSlot(slot)}
            >
              Retirer
            </button>
          </div>
        ))
      )}
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
