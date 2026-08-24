import { ClipboardCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { classesApi, scheduleApi } from '../../api';
import { useAuth } from '../../auth/auth-context';
import { AttendanceSheetPanel } from '../../components/AttendanceSheetPanel';
import { todayLocalIso } from '../../lib/format';
import { EmptyState, Skeleton } from '../../ui';

/**
 * Présence, côté enseignant : deux cas selon le mode de la classe.
 * - Mode `notes` : un appel par créneau, ce jour — « mes cours aujourd'hui ».
 * - Mode `presence` (maternelle/garderie) : un appel par jour, réservé au
 *   référent désigné de la classe (voir `attendance.service.ts` côté
 *   backend, jamais « un des professeurs qui y enseignent »).
 */
export default function TeacherAttendancePage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const classes = classesApi.useClasses();
  const today = todayLocalIso();
  const mySlots = scheduleApi.useMySchedule(today);

  const homeroom = (classes.data ?? []).filter(
    (item) => item.mode === 'presence' && item.homeroomTeacherId === user?.id,
  );

  const slotParam = params.get('creneau') ? Number(params.get('creneau')) : undefined;
  const classParam = params.get('classe') ? Number(params.get('classe')) : undefined;
  const selectedSlot = slotParam !== undefined ? (mySlots.data ?? []).find((s) => s.id === slotParam) : undefined;
  const selectedClass = classParam !== undefined ? homeroom.find((c) => c.id === classParam) : undefined;

  function pickClass(id: number) {
    setParams({ classe: String(id) });
  }
  function pickSlot(id: number) {
    setParams({ creneau: String(id) });
  }

  if (classes.isPending || mySlots.isPending) {
    return (
      <>
        <h1 className="tshell__page-title">Présence</h1>
        <Skeleton height={200} />
      </>
    );
  }

  if (selectedSlot) {
    return (
      <>
        <button className="tsaisie-back" onClick={() => setParams({})}>← Changer de cours</button>
        <div className="tsaisie-head">
          <div>
            <h1 className="tshell__page-title">{selectedSlot.className}</h1>
            <p className="tshell__page-subtitle">
              {selectedSlot.subjectName} · {selectedSlot.startTime}–{selectedSlot.endTime}
            </p>
          </div>
        </div>
        <AttendanceSheetPanel slotId={selectedSlot.id} initialDate={today} />
      </>
    );
  }

  if (selectedClass) {
    return (
      <>
        <button className="tsaisie-back" onClick={() => setParams({})}>← Changer de classe</button>
        <div className="tsaisie-head">
          <div>
            <h1 className="tshell__page-title">{selectedClass.name}</h1>
            <p className="tshell__page-subtitle">Niveau {selectedClass.level}</p>
          </div>
        </div>
        <AttendanceSheetPanel classId={selectedClass.id} />
      </>
    );
  }

  const slots = mySlots.data ?? [];
  const hasNothing = slots.length === 0 && homeroom.length === 0;

  return (
    <>
      <div>
        <h1 className="tshell__page-title">Présence</h1>
        <p className="tshell__page-subtitle">Choisissez un cours</p>
      </div>

      {hasNothing ? (
        <EmptyState
          icon={<ClipboardCheck size={28} />}
          title="Rien à saisir aujourd'hui"
          description="Aucun créneau ne vous est affecté aujourd'hui, et vous n'êtes référent d'aucune classe."
        />
      ) : (
        <div className="tcards">
          {slots.map((slot) => (
            <button key={`slot-${slot.id}`} className="tpick" onClick={() => pickSlot(slot.id)}>
              <span className="tpick__body">
                <span className="tpick__title">{slot.className}</span>
                <span className="tpick__meta">
                  {slot.subjectName} · {slot.startTime}–{slot.endTime}
                </span>
              </span>
              <span className="tpick__chevron" aria-hidden="true">›</span>
            </button>
          ))}
          {homeroom.map((item) => (
            <button key={`class-${item.id}`} className="tpick" onClick={() => pickClass(item.id)}>
              <span className="tpick__body">
                <span className="tpick__title">{item.name}</span>
                <span className="tpick__meta">Niveau {item.level}</span>
              </span>
              <span className="tpick__chevron" aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
