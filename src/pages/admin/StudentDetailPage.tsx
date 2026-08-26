import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  attendanceApi, studentsApi,
  type ID, type StudentAttendanceHistoryRecord, type StudentDetail, type StudentRecentGrade, type StudentResult,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useTermContext } from '../../context/term-context';
import { formatDate, formatGrade, formatRelative, plural } from '../../lib/format';
import { personName } from '../../lib/text';
import { TermSelect } from '../../layouts/TermSelect';
import { paths } from '../../routes/paths';
import {
  Avatar, Button, Skeleton, attendanceTone, gradeTone, toneClasses,
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
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-8 py-6">
        <div className="flex items-center gap-3">
          <Link
            to={paths.admin.students}
            aria-label="Retour aux élèves"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {detail.data ? `${detail.data.firstName} ${detail.data.lastName}` : 'Élève'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {detail.data
                ? `${detail.data.classe.name} · ${term ? term.label : 'Aucune période sélectionnée'}`
                : 'Fiche élève'}
            </p>
          </div>
        </div>
        <TermSelect />
      </div>
      <div className="p-8">
        <QueryBoundary query={detail} loading={<DetailSkeleton />}>
          {(data) => <StudentBody data={data} onManageParents={() => setLinking(true)} />}
        </QueryBoundary>
      </div>

      <LinkParentModal student={linking ? (detail.data ?? null) : null} onClose={() => setLinking(false)} />
    </>
  );
}

function StudentBody({ data, onManageParents }: { data: StudentDetail; onManageParents: () => void }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Parents</h2>
            <Button size="sm" variant="secondary" onClick={onManageParents}>Gérer les parents</Button>
          </div>
          {data.parents.length === 0 ? (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${toneClasses('danger')}`}>
              Aucun parent associé
            </span>
          ) : (
            <div className="space-y-3">
              {data.parents.map((parent) => (
                <div key={parent.id} className="flex items-center gap-3">
                  <Avatar name={personName(parent)} size={32} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-gray-900">{personName(parent)}</div>
                    <div className="truncate text-xs text-gray-600">
                      {parent.phone ? <span className="font-semibold text-blue-700">📞 {parent.phone}</span> : null}
                      {parent.phone && parent.email ? <span> · </span> : null}
                      {parent.email ? <span>✉️ {parent.email}</span> : null}
                      {!parent.phone && !parent.email ? '—' : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-gray-900">Identité</h2>
          <div className="space-y-2">
            <IdentityRow label="Classe" value={data.classe.name} />
            <IdentityRow label="Niveau" value={data.classe.level ?? '—'} />
            <IdentityRow label="Date de naissance" value={data.birthDate ? formatDate(data.birthDate) : '—'} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-gray-900">Bulletin de la période</h2>
        <BulletinSection bulletin={data.bulletin} annualAverage={data.annualAverage} />
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-gray-900">Fiche d'absence</h2>
        <AttendanceHistorySection studentId={data.id} />
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-gray-900">Notes récentes</h2>
        <RecentGradesList grades={data.dernieresNotes} />
      </div>
    </div>
  );
}

/**
 * Historique complet de présence, borné à la période sélectionnée (l'en-tête
 * de la fiche élève) : la fiche d'absence individuelle. Remplace la liste
 * « Présence récente », plafonnée côté backend, qui ne disait pas combien
 * d'absences un élève cumule sur la période.
 */
function AttendanceHistorySection({ studentId }: { studentId: ID }) {
  const { termId, term } = useTermContext();
  const history = attendanceApi.useStudentAttendanceHistory(studentId, termId);

  return (
    <QueryBoundary query={history} loading={<Skeleton height={160} />} errorTitle="La présence n'a pas pu être chargée">
      {(records) => (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {term ? `Sur ${term.label} : ` : 'Depuis le début : '}
            <AttendanceSummary records={records} />
          </p>
          <AttendanceList records={records} />
        </div>
      )}
    </QueryBoundary>
  );
}

function AttendanceSummary({ records }: { records: StudentAttendanceHistoryRecord[] }) {
  if (records.length === 0) return <>aucune présence enregistrée.</>;

  const present = records.filter((r) => r.status === 'present').length;
  const late = records.filter((r) => r.status === 'late').length;
  const absent = records.filter((r) => r.status === 'absent').length;

  const parts: string[] = [];
  if (present > 0) parts.push(`${present} ${plural(present, 'présence')}`);
  if (late > 0) parts.push(`${late} ${plural(late, 'retard')}`);
  if (absent > 0) parts.push(`${absent} ${plural(absent, 'absence')}`);

  return <>{parts.join(' · ')}.</>;
}

function IdentityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function BulletinSection({
  bulletin, annualAverage,
}: { bulletin: StudentResult | null; annualAverage: number | null }) {
  if (!bulletin) {
    return (
      <p className="text-sm text-gray-500">
        Sélectionnez une période, dans l'en-tête, pour voir le bulletin de cet élève.
      </p>
    );
  }

  if (bulletin.subjects.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="font-semibold text-gray-900">Aucune note sur cette période</p>
        <p className="mt-1 text-sm text-gray-500">
          Le bulletin apparaîtra dès les premières saisies des enseignants.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Bulletin de {bulletin.firstName} {bulletin.lastName}
          </caption>
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-2.5">Matière</th>
              <th className="px-4 py-2.5 text-center">Coefficient</th>
              <th className="px-4 py-2.5 text-center">Moyenne</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bulletin.subjects.map((subject) => (
              <tr key={subject.subjectId}>
                <td className="px-4 py-2.5 font-semibold text-gray-900">{subject.subjectName}</td>
                <td className="px-4 py-2.5 text-center text-gray-700">{subject.coefficient}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${toneClasses(gradeTone(subject.average))}`}>
                    {formatGrade(subject.average)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <p className="text-sm font-bold text-gray-900">
          Moyenne générale : {formatGrade(bulletin.average)}
        </p>
        {annualAverage !== null ? (
          <p className="text-sm font-semibold text-gray-500">
            Moyenne annuelle : {formatGrade(annualAverage)}
          </p>
        ) : null}
      </div>
    </>
  );
}

function AttendanceList({ records }: { records: StudentAttendanceHistoryRecord[] }) {
  if (records.length === 0) {
    return <p className="text-sm text-gray-500">Aucune présence enregistrée sur cette période.</p>;
  }

  return (
    <div className="max-h-96 space-y-3 overflow-y-auto">
      {records.map((record) => (
        <div key={record.id} className="flex items-center gap-3">
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${toneClasses(attendanceTone(record.status))}`}>
            {ATTENDANCE_LABEL[record.status]}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900">
              {formatDate(record.date)}
              {record.subjectName ? <span className="font-normal text-gray-500"> · {record.subjectName}</span> : null}
            </div>
            {record.comment ? <div className="truncate text-xs text-gray-500">{record.comment}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentGradesList({ grades }: { grades: StudentRecentGrade[] }) {
  if (grades.length === 0) {
    return <p className="text-sm text-gray-500">Aucune note saisie récemment.</p>;
  }

  return (
    <div className="space-y-3">
      {grades.map((grade) => (
        <div key={grade.id} className="flex items-center gap-3">
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${toneClasses(gradeTone(grade.value, grade.maxValue))}`}>
            {grade.value} / {grade.maxValue}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-gray-900">{grade.matiere.name} · {grade.periode.label}</div>
            <div className="truncate text-xs text-gray-500">{grade.type.label}</div>
          </div>
          <span className="shrink-0 text-xs text-gray-400">{formatRelative(grade.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"><Skeleton height={80} /></div>
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"><Skeleton height={80} /></div>
      </div>
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"><Skeleton height={140} /></div>
    </div>
  );
}
