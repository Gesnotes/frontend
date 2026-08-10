import { useSearchParams } from 'react-router-dom';

import { classesApi } from '../../api';
import { useAuth } from '../../auth/auth-context';
import { AttendanceSheetPanel } from '../../components/AttendanceSheetPanel';
import { EmptyState, Skeleton } from '../../ui';

/**
 * Présence, côté enseignant : réservée au référent de la classe (voir
 * `attendance.service.ts` côté backend), jamais « un des professeurs qui y
 * enseignent ». La liste ne montre donc que les classes dont ce compte est
 * le référent désigné.
 */
export default function TeacherAttendancePage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const classes = classesApi.useClasses();

  const mine = (classes.data ?? []).filter((item) => item.homeroomTeacherId === user?.id);

  const classId = params.get('classe') ? Number(params.get('classe')) : undefined;
  const selected = mine.find((item) => item.id === classId);

  function pick(id: number) {
    setParams({ classe: String(id) });
  }

  if (classes.isPending) {
    return (
      <>
        <h1 className="tshell__page-title">Présence</h1>
        <Skeleton height={200} />
      </>
    );
  }

  if (selected) {
    return (
      <>
        <button className="tsaisie-back" onClick={() => setParams({})}>← Changer de classe</button>
        <div className="tsaisie-head">
          <div>
            <h1 className="tshell__page-title">{selected.name}</h1>
            <p className="tshell__page-subtitle">Niveau {selected.level}</p>
          </div>
        </div>
        <AttendanceSheetPanel classId={selected.id} />
      </>
    );
  }

  return (
    <>
      <div>
        <h1 className="tshell__page-title">Présence</h1>
        <p className="tshell__page-subtitle">Choisissez une classe</p>
      </div>

      {mine.length === 0 ? (
        <EmptyState
          icon="✓"
          title="Aucune classe"
          description="Vous n'êtes désigné référent d'aucune classe. Seul le référent d'une classe peut y prendre la présence."
        />
      ) : (
        <div className="tcards">
          {mine.map((item) => (
            <button key={item.id} className="tpick" onClick={() => pick(item.id)}>
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
