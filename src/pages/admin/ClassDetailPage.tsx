import { ChevronLeft, GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { classesApi, type ClassDetail, type ID, type RankedStudentResult } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useTermContext } from '../../context/term-context';
import { formatCount, formatGrade } from '../../lib/format';
import { TermSelect } from '../../layouts/TermSelect';
import { paths } from '../../routes/paths';
import {
  Avatar, Button, Skeleton, StatCardIcon, gradeTone, toneClasses,
} from '../../ui';
import { ClassBulletinPanel } from './ClassBulletinPanel';
import { ClassSchedulePanel } from './ClassSchedulePanel';
import { ClassSubjectsPanel } from './ClassSubjectsPanel';
import { TermRequired } from './TermRequired';

type TabKey = 'vue' | 'eleves' | 'matieres' | 'emploi';

export default function ClassDetailPage() {
  const { classId } = useParams();
  const id = Number(classId);
  const { termId, term } = useTermContext();

  const detail = classesApi.useClassDetail(
    Number.isFinite(id) ? id : undefined,
    termId,
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-8 py-6">
        <div className="flex items-center gap-3">
          <Link
            to={paths.admin.classes}
            aria-label="Retour aux classes"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{detail.data?.className ?? 'Classe'}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {detail.data ? `Niveau ${detail.data.level} · ${term?.label ?? ''}` : 'Résultats de la classe'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TermSelect />
          <Link to={paths.admin.classEnrollment(id)}>
            <Button variant="secondary">Réinscrire</Button>
          </Link>
          <Link to={paths.admin.classBulletin(id)}>
            <Button variant="secondary">Bulletin de classe</Button>
          </Link>
        </div>
      </div>
      <div className="p-8">
        <TermRequired>
          <QueryBoundary query={detail} loading={<DetailSkeleton />}>
            {(data) => <ClassBody data={data} termId={termId} />}
          </QueryBoundary>
        </TermRequired>
      </div>
    </>
  );
}

function ClassBody({ data, termId }: { data: ClassDetail; termId: ID | undefined }) {
  const { stats } = data;
  const hasSchedule = data.mode === 'notes';

  const [tab, setTab] = useState<TabKey>('vue');

  const items: { key: TabKey; label: string; badge?: string }[] = [
    { key: 'vue', label: "Vue d'ensemble" },
    { key: 'eleves', label: 'Élèves', badge: formatCount(stats.effectif) },
    { key: 'matieres', label: 'Matières' },
    ...(hasSchedule ? [{ key: 'emploi' as TabKey, label: 'Emploi du temps' }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="inline-flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
        {items.map((item) => {
          const active = item.key === tab;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                active ? 'bg-[#dde1ff] text-[#173bab]' : 'text-gray-500 hover:bg-gray-200'
              }`}
            >
              {item.label}
              {item.badge !== undefined ? (
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold">{item.badge}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === 'vue' ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCardIcon icon={GraduationCap} tone="bg-blue-50 text-blue-600" label="Effectif" value={formatCount(stats.effectif)} />
          <StatCardIcon
            icon={GraduationCap}
            tone="bg-violet-50 text-violet-600"
            label="Élèves évalués"
            value={formatCount(stats.evalues)}
            hint={`sur ${formatCount(stats.effectif)}`}
          />
          <StatCardIcon icon={GraduationCap} tone="bg-[#dde1ff] text-[#173bab]" label="Moyenne de classe" value={`${formatGrade(stats.average)} / 20`} />
          <StatCardIcon
            icon={GraduationCap}
            tone="bg-amber-50 text-amber-600"
            label="Meilleure / plus faible"
            value={`${formatGrade(stats.meilleure)} · ${formatGrade(stats.plusFaible)}`}
          />
        </div>
      ) : null}

      {tab === 'eleves' ? (
        <div className="space-y-6">
          {/*
            Les notes par matière, à même la fiche.
            Le tableau ci-dessous classe les élèves mais ne dit pas *dans quelle
            matière* l'un décroche : il fallait ouvrir le bulletin en pleine page
            pour le savoir.
          */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-gray-900">Notes par matière</h2>
            <ClassBulletinPanel classId={data.classId} termId={termId} />
          </div>

          <RankedStudentsTable data={data} />
        </div>
      ) : null}

      {tab === 'matieres' ? <ClassSubjectsPanel classId={data.classId} /> : null}

      {tab === 'emploi' && hasSchedule ? <ClassSchedulePanel classId={data.classId} /> : null}
    </div>
  );
}

function RankedStudentsTable({ data }: { data: ClassDetail }) {
  if (data.students.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
        <p className="font-semibold text-gray-900">Aucun élève dans cette classe</p>
        <p className="mt-1 text-sm text-gray-500">
          Inscrivez des élèves depuis l'écran Élèves pour voir apparaître leurs résultats.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Élèves de {data.className}, classés par moyenne</caption>
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="px-6 py-3 w-14">#</th>
            <th className="px-6 py-3">Élève</th>
            <th className="px-6 py-3">Moyenne</th>
            <th className="px-6 py-3">Progression</th>
            <th className="px-6 py-3 text-right">Matières notées</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.students.map((student) => (
            <StudentRow key={student.studentId} student={student} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StudentRow({ student }: { student: RankedStudentResult }) {
  const notedCount = student.subjects.filter((s) => s.average !== null).length;
  const pct = student.average !== null ? Math.min(100, Math.max(0, (student.average / 20) * 100)) : 0;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 font-bold text-gray-400">{student.rang ?? '—'}</td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={`${student.firstName} ${student.lastName}`} size={32} />
          <span className="font-semibold text-gray-900">{student.firstName} {student.lastName}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${toneClasses(gradeTone(student.average))}`}>
          {formatGrade(student.average)}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full ${student.average !== null && student.average >= 17 ? 'bg-emerald-500' : 'bg-[#173bab]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </td>
      <td className="px-6 py-4 text-right text-gray-700">{formatCount(notedCount)}</td>
    </tr>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <Skeleton width="60%" height={12} />
            <Skeleton width="45%" height={28} style={{ marginTop: 14 }} />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} height={38} style={{ marginBottom: 12 }} />
        ))}
      </div>
    </div>
  );
}
