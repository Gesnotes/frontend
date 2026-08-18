import { ChevronLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import {
  teachersApi,
  type TeacherAssignment, type TeacherDetail, type TeacherRecentAttendance, type TeacherRecentGrade,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { formatCount, formatDate, formatRelative, plural } from '../../lib/format';
import { personName } from '../../lib/text';
import { paths } from '../../routes/paths';
import {
  Chip, Skeleton, attendanceTone, gradeTone, toneClasses,
} from '../../ui';

const ATTENDANCE_LABEL = { present: 'Présent', late: 'Retard', absent: 'Absent' } as const;

export default function TeacherDetailPage() {
  const { teacherId } = useParams();
  const id = Number(teacherId);

  const detail = teachersApi.useTeacherDetail(Number.isFinite(id) ? id : undefined);

  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-8 py-6">
        <div className="flex items-center gap-3">
          <Link
            to={paths.admin.teachers}
            aria-label="Retour aux enseignants"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {detail.data ? personName(detail.data, 'Invitation en attente') : 'Enseignant'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{detail.data?.email ?? 'Fiche enseignant'}</p>
          </div>
        </div>
      </div>
      <div className="p-8">
        <QueryBoundary query={detail} loading={<DetailSkeleton />}>
          {(data) => <TeacherBody data={data} />}
        </QueryBoundary>
      </div>
    </>
  );
}

function TeacherBody({ data }: { data: TeacherDetail }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-bold text-gray-900">Identité</h2>
          <div className="space-y-2">
            <IdentityRow label="Email" value={data.email} />
            <IdentityRow label="Téléphone" value={data.phone ?? '—'} />
            <IdentityRow
              label="Notes saisies"
              value={`${formatCount(data.totalNotesSaisies)} ${plural(data.totalNotesSaisies, 'note')}`}
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-bold text-gray-900">Affectations</h2>
          <AffectationsList affectations={data.affectations} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-bold text-gray-900">Notes récentes</h2>
          <RecentGradesList grades={data.dernieresNotes} />
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-bold text-gray-900">Présence récente</h2>
          <AttendanceList records={data.dernieresPresences} />
        </div>
      </div>
    </div>
  );
}

function IdentityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function AffectationsList({ affectations }: { affectations: TeacherAssignment[] }) {
  if (affectations.length === 0) {
    return <p className="text-sm text-gray-500">Aucune affectation : cet enseignant ne peut saisir aucune note.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {affectations.map((a) => (
        <Chip key={a.id} tone="info">{a.subjectName} · {a.className}</Chip>
      ))}
    </div>
  );
}

function RecentGradesList({ grades }: { grades: TeacherRecentGrade[] }) {
  if (grades.length === 0) {
    return <p className="text-sm text-gray-500">Aucune note saisie récemment par ce compte.</p>;
  }

  return (
    <div className="space-y-3">
      {grades.map((grade) => (
        <div key={grade.id} className="flex items-center gap-3">
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${toneClasses(gradeTone(grade.value, grade.maxValue))}`}>
            {grade.value} / {grade.maxValue}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-gray-900">{personName(grade.eleve)}</div>
            <div className="truncate text-xs text-gray-500">{grade.matiere.name} · {grade.type.label}</div>
          </div>
          <span className="shrink-0 text-xs text-gray-400">{formatRelative(grade.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}

function AttendanceList({ records }: { records: TeacherRecentAttendance[] }) {
  if (records.length === 0) {
    return <p className="text-sm text-gray-500">Aucune présence enregistrée récemment par ce compte.</p>;
  }

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <div key={record.id} className="flex items-center gap-3">
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${toneClasses(attendanceTone(record.status))}`}>
            {ATTENDANCE_LABEL[record.status]}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-gray-900">{personName(record.eleve)}</div>
            <div className="truncate text-xs text-gray-500">{formatDate(record.date)}</div>
          </div>
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
