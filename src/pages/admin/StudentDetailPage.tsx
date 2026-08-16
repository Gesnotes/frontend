import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  studentsApi,
  type StudentAttendanceRecord, type StudentDetail, type StudentRecentGrade, type StudentResult,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useTermContext } from '../../context/term-context';
import { formatDate, formatGrade, formatRelative } from '../../lib/format';
import { personName } from '../../lib/text';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import { TermSelect } from '../../layouts/TermSelect';
import { paths } from '../../routes/paths';
import {
  Avatar, Button, Card, Chip, EmptyState, SectionTitle, Skeleton,
  attendanceTone, gradeTone,
} from '../../ui';
import { LinkParentModal } from './LinkParentModal';

const ATTENDANCE_LABEL = { present: 'Présent', late: 'Retard', absent: 'Absent' } as const;

export default function StudentDetailPage() {
  const { studentId } = useParams();
  const id = Number(studentId);
  const { termId, term } = useTermContext();

  const detail = studentsApi.useStudentDetail(Number.isFinite(id) ? id : undefined, termId);
  const [linking, setLinking] = useState(false);

  return (
    <>
      <PageHeader
        title={detail.data ? `${detail.data.firstName} ${detail.data.lastName}` : 'Élève'}
        subtitle={
          detail.data
            ? `${detail.data.classe.name} · ${term ? term.label : 'Aucune période sélectionnée'}`
            : 'Fiche élève'
        }
        back={
          <Link to={paths.admin.students}>
            <Button variant="ghost" aria-label="Retour aux élèves">‹</Button>
          </Link>
        }
        actions={<TermSelect />}
      />
      <PageContent>
        <QueryBoundary query={detail} loading={<DetailSkeleton />}>
          {(data) => <StudentBody data={data} onManageParents={() => setLinking(true)} />}
        </QueryBoundary>
      </PageContent>

      <LinkParentModal student={linking ? (detail.data ?? null) : null} onClose={() => setLinking(false)} />
    </>
  );
}

function StudentBody({ data, onManageParents }: { data: StudentDetail; onManageParents: () => void }) {
  return (
    <div className="page-stack">
      <div className="grid-split">
        <Card padded>
          <SectionTitle
            aside={<Button size="sm" variant="secondary" onClick={onManageParents}>Gérer les parents</Button>}
          >
            Parents
          </SectionTitle>
          {data.parents.length === 0 ? (
            <Chip tone="danger">Aucun parent associé</Chip>
          ) : (
            <div className="list-rows">
              {data.parents.map((parent) => (
                <div key={parent.id} className="list-row">
                  <Avatar name={personName(parent)} size={32} />
                  <div className="list-row__body">
                    <div className="list-row__title">{personName(parent)}</div>
                    <div className="list-row__meta">{parent.email ?? parent.phone ?? '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padded>
          <SectionTitle>Identité</SectionTitle>
          <div className="page-stack" style={{ gap: 'var(--space-2)' }}>
            <IdentityRow label="Classe" value={data.classe.name} />
            <IdentityRow label="Niveau" value={data.classe.level ?? '—'} />
            <IdentityRow label="Date de naissance" value={data.birthDate ? formatDate(data.birthDate) : '—'} />
          </div>
        </Card>
      </div>

      <Card padded>
        <SectionTitle>Bulletin de la période</SectionTitle>
        <BulletinSection bulletin={data.bulletin} />
      </Card>

      <div className="grid-split">
        <Card padded>
          <SectionTitle>Présence récente</SectionTitle>
          <AttendanceList records={data.presence} />
        </Card>

        <Card padded>
          <SectionTitle>Notes récentes</SectionTitle>
          <RecentGradesList grades={data.dernieresNotes} />
        </Card>
      </div>
    </div>
  );
}

function IdentityRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
      <span className="t-body-md t-muted">{label}</span>
      <span className="t-body-md" style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function BulletinSection({ bulletin }: { bulletin: StudentResult | null }) {
  if (!bulletin) {
    return (
      <p className="t-body-md t-muted">
        Sélectionnez une période, dans l'en-tête, pour voir le bulletin de cet élève.
      </p>
    );
  }

  if (bulletin.subjects.length === 0) {
    return (
      <EmptyState
        icon="▤"
        title="Aucune note sur cette période"
        description="Le bulletin apparaîtra dès les premières saisies des enseignants."
      />
    );
  }

  return (
    <>
      <div className="dash-bulletin__scroll">
        <table className="ui-table">
          <caption className="sr-only">
            Bulletin de {bulletin.firstName} {bulletin.lastName}
          </caption>
          <thead>
            <tr>
              <th scope="col">Matière</th>
              <th scope="col" className="is-center">Coefficient</th>
              <th scope="col" className="is-center">Moyenne</th>
            </tr>
          </thead>
          <tbody>
            {bulletin.subjects.map((subject) => (
              <tr key={subject.subjectId}>
                <td>{subject.subjectName}</td>
                <td className="is-center">{subject.coefficient}</td>
                <td className="is-center">
                  <Chip tone={gradeTone(subject.average)}>{formatGrade(subject.average)}</Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="t-body-md" style={{ marginTop: 'var(--space-4)', fontWeight: 700 }}>
        Moyenne générale : {formatGrade(bulletin.average)}
      </p>
    </>
  );
}

function AttendanceList({ records }: { records: StudentAttendanceRecord[] }) {
  if (records.length === 0) {
    return <p className="t-body-md t-muted">Aucune présence enregistrée récemment.</p>;
  }

  return (
    <div className="list-rows">
      {records.map((record) => (
        <div key={record.id} className="list-row">
          <Chip tone={attendanceTone(record.status)}>{ATTENDANCE_LABEL[record.status]}</Chip>
          <div className="list-row__body">
            <div className="list-row__title">{formatDate(record.date)}</div>
            {record.comment ? <div className="list-row__meta">{record.comment}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentGradesList({ grades }: { grades: StudentRecentGrade[] }) {
  if (grades.length === 0) {
    return <p className="t-body-md t-muted">Aucune note saisie récemment.</p>;
  }

  return (
    <div className="list-rows">
      {grades.map((grade) => (
        <div key={grade.id} className="list-row">
          <Chip tone={gradeTone(grade.value, grade.maxValue)}>
            {grade.value} / {grade.maxValue}
          </Chip>
          <div className="list-row__body">
            <div className="list-row__title">{grade.matiere.name} · {grade.periode.label}</div>
            <div className="list-row__meta">{grade.type.label}</div>
          </div>
          <span className="list-row__meta">{formatRelative(grade.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="page-stack">
      <div className="grid-split">
        <Card padded><Skeleton height={80} /></Card>
        <Card padded><Skeleton height={80} /></Card>
      </div>
      <Card padded><Skeleton height={140} /></Card>
    </div>
  );
}
