import { ClipboardList } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { studentsApi, type StudentDetail, type SubjectResult } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useTermContext } from '../../context/term-context';
import { formatDate, formatGrade } from '../../lib/format';
import { personName } from '../../lib/text';
import {
  Avatar, Card, Chip, EmptyState, Skeleton, attendanceTone, gradeTone,
} from '../../ui';

const ATTENDANCE_LABEL = { present: 'Présent', late: 'Retard', absent: 'Absent' } as const;

/**
 * Fiche élève côté professeur : identité, moyennes par matière (avec le
 * détail interrogation/devoir/composition, comme la fiche parent) et
 * présence récente. Mêmes données que la fiche admin (`GET
 * /students/:id/detail`, déjà accessible au professeur), présentées en
 * cartes mobiles plutôt qu'en tableau desktop.
 */
export default function TeacherStudentDetailPage() {
  const { studentId } = useParams();
  const id = Number(studentId);
  const navigate = useNavigate();
  const { termId, term } = useTermContext();

  const detail = studentsApi.useStudentDetail(Number.isFinite(id) ? id : undefined, termId);

  return (
    <>
      <button className="tsaisie-back" onClick={() => navigate(-1)}>← Élèves</button>

      <QueryBoundary query={detail} loading={<DetailSkeleton />}>
        {(data) => <StudentBody data={data} termLabel={term?.label} />}
      </QueryBoundary>
    </>
  );
}

function StudentBody({ data, termLabel }: { data: StudentDetail; termLabel: string | undefined }) {
  return (
    <div className="page-stack" style={{ gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <Avatar name={`${data.firstName} ${data.lastName}`} size={48} />
        <div>
          <h1 className="tshell__page-title">{data.firstName} {data.lastName}</h1>
          <p className="tshell__page-subtitle">{data.classe.name}{termLabel ? ` · ${termLabel}` : ''}</p>
        </div>
      </div>

      <ParentsSection parents={data.parents} />
      <AverageSummary data={data} />
      <SubjectList data={data} />
      <AttendanceSection records={data.presence} />
    </div>
  );
}

function ParentsSection({ parents }: { parents: StudentDetail['parents'] }) {
  if (!parents || parents.length === 0) return null;

  return (
    <Card padded>
      <div className="parent__row-title" style={{ marginBottom: 'var(--space-3)' }}>
        Parents & Contacts
      </div>
      <div className="page-stack" style={{ gap: 'var(--space-2)' }}>
        {parents.map((parent) => (
          <div key={parent.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Avatar name={personName(parent)} size={36} />
            <div>
              <div className="t-body-md" style={{ fontWeight: 600 }}>{personName(parent)}</div>
              <div className="t-body-sm" style={{ color: '#2563eb', fontWeight: 600 }}>
                {parent.phone ? <span>📞 {parent.phone}</span> : null}
                {parent.phone && parent.email ? <span style={{ color: '#6b7280' }}> · </span> : null}
                {parent.email ? <span style={{ color: '#374151' }}>✉️ {parent.email}</span> : null}
                {!parent.phone && !parent.email ? '—' : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AverageSummary({ data }: { data: StudentDetail }) {
  if (data.bulletin === null && data.annualAverage === null) return null;

  return (
    <Card padded>
      <div style={{ display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
        <div>
          <div className="parent__row-meta">Moyenne générale</div>
          <div style={{ fontSize: 'var(--title-md-size)', fontWeight: 800 }}>
            {formatGrade(data.bulletin?.average ?? null)}
          </div>
        </div>
        {data.annualAverage !== null ? (
          <div>
            <div className="parent__row-meta">Moyenne annuelle</div>
            <div style={{ fontSize: 'var(--title-md-size)', fontWeight: 800, color: 'var(--on-surface-variant)' }}>
              {formatGrade(data.annualAverage)}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function SubjectList({ data }: { data: StudentDetail }) {
  const subjects: SubjectResult[] = data.bulletin?.subjects ?? [];

  if (subjects.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList size={28} />}
        title="Aucune note sur cette période"
        description="Choisissez une autre période, ou revenez lorsque les notes auront été saisies."
      />
    );
  }

  return (
    <div className="tcards" style={{ gap: 'var(--space-3)' }}>
      {subjects.map((subject) => (
        <Card key={subject.subjectId} padded>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)' }}>
            <div>
              <div className="tpick__title">{subject.subjectName}</div>
              <div className="parent__row-meta">Coefficient {subject.coefficient}</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: 'var(--title-md-size)', fontWeight: 800 }}>
                {formatGrade(subject.average)}
              </div>
              <div className="parent__row-meta">moyenne</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-4)' }}>
            {subject.categories.map((category) => (
              <Chip key={category.gradeTypeId} tone={gradeTone(category.average)}>
                {category.label} · {formatGrade(category.average)} (coef. {category.weight})
              </Chip>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function AttendanceSection({ records }: { records: StudentDetail['presence'] }) {
  return (
    <section>
      <h2 className="parent__section-title" style={{ marginBottom: 'var(--space-3)' }}>
        Présence récente
      </h2>
      {records.length === 0 ? (
        <p className="t-body-md t-muted">Aucune présence enregistrée récemment.</p>
      ) : (
        <div className="page-stack" style={{ gap: 'var(--space-2)' }}>
          {records.map((record) => (
            <div key={record.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Chip tone={attendanceTone(record.status)}>{ATTENDANCE_LABEL[record.status]}</Chip>
              <div>
                <div className="t-body-md" style={{ fontWeight: 600 }}>{formatDate(record.date)}</div>
                {record.comment ? <div className="t-body-sm t-muted">{record.comment}</div> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div className="page-stack" style={{ gap: 'var(--space-4)' }}>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} height={100} radius="var(--radius-lg)" />
      ))}
    </div>
  );
}
