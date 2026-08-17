import { ClipboardCheck } from 'lucide-react';

import { attendanceApi, type ChildAttendanceRecord } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useChildContext } from '../../context/child-context';
import { formatCount, formatDate, plural } from '../../lib/format';
import { Chip, EmptyState, Skeleton, attendanceTone } from '../../ui';
import { ChildRequired } from './ChildRequired';

const LABELS = { present: 'Présent', late: 'Retard', absent: 'Absent' } as const;

export default function ChildAttendancePage() {
  const { child } = useChildContext();

  const records = attendanceApi.useChildAttendance(child?.id);

  return (
    <main className="parent__body">
      <header className="parent__topbar">
        <div>
          <h1 className="parent__name">Présence</h1>
          <p className="parent__greeting">
            {child ? `${child.firstName} ${child.lastName} · ${child.classe.name}` : ''}
          </p>
        </div>
      </header>

      <ChildRequired>
        <QueryBoundary query={records} loading={<ListSkeleton />}>
          {(items) => <AttendanceList records={items} />}
        </QueryBoundary>
      </ChildRequired>
    </main>
  );
}

function AttendanceList({ records }: { records: ChildAttendanceRecord[] }) {
  if (records.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardCheck size={28} />}
        title="Aucune présence enregistrée"
        description="Le journal de présence apparaîtra ici dès la première saisie de l'école."
      />
    );
  }

  return (
    <section>
      <p className="t-body-md t-muted" style={{ marginBottom: 'var(--space-4)' }}>
        {formatCount(records.length)} {plural(records.length, 'jour')} enregistré{records.length > 1 ? 's' : ''}
      </p>

      <div className="parent__cards">
        {records.map((record) => (
          <div key={record.id} className="ui-card parent__row">
            <Chip tone={attendanceTone(record.status)}>{LABELS[record.status]}</Chip>
            <span className="parent__row-body">
              <span className="parent__row-title">
                {formatDate(record.date)}
                {record.subjectName ? ` · ${record.subjectName}` : ''}
              </span>
              {record.comment ? <span className="parent__row-meta">{record.comment}</span> : null}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ListSkeleton() {
  return (
    <div className="parent__cards">
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} height={64} radius="var(--radius-lg)" />
      ))}
    </div>
  );
}
