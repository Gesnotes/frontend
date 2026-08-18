import { ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';

import { parentApi, type ParentGrade } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useChildContext } from '../../context/child-context';
import { useTermContext } from '../../context/term-context';
import { formatCount, formatDateShort, plural } from '../../lib/format';
import { paths } from '../../routes/paths';
import { Chip, EmptyState, Skeleton, gradeTone } from '../../ui';
import { ChildRequired } from './ChildRequired';
import { ChildSwitcher } from './ChildSwitcher';
import { TermPicker } from './TermPicker';

export default function GradesHistoryPage() {
  const { termId } = useTermContext();
  const { child } = useChildContext();

  const grades = parentApi.useChildGrades(child?.id, { termId });

  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col gap-6 px-4 pb-24 pt-5">
      <header>
        <h1 className="text-xl font-bold text-gray-900">Notes</h1>
      </header>

      <ChildRequired>
        <ChildSwitcher />
        <TermPicker />

        <QueryBoundary query={grades} loading={<ListSkeleton />}>
          {(items) => <GradeList grades={items} />}
        </QueryBoundary>
      </ChildRequired>
    </main>
  );
}

function GradeList({ grades }: { grades: ParentGrade[] }) {
  if (grades.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList size={28} />}
        title="Aucune note sur cette période"
        description="Vous serez notifié dès qu'un enseignant saisira une note."
      />
    );
  }

  return (
    <section>
      <p className="mb-4 text-xs text-gray-500">
        {formatCount(grades.length)} {plural(grades.length, 'note')}
      </p>

      <div className="flex flex-col gap-3">
        {grades.map((grade) => (
          <Link
            key={grade.id}
            to={paths.parent.grade(grade.id)}
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <Chip tone={gradeTone(grade.value, grade.maxValue)}>
              {grade.value} / {grade.maxValue}
            </Chip>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-gray-900">{grade.matiere.name}</span>
              <span className="mt-0.5 block text-xs text-gray-500">
                {grade.evaluation.label} · {grade.type.label} ·{' '}
                {formatDateShort(grade.evaluation.date ?? grade.createdAt)}
                {grade.comment ? ' · commentaire' : ''}
              </span>
            </span>
            <span className="shrink-0 text-lg text-gray-300" aria-hidden="true">›</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} height={76} radius={16} />
      ))}
    </div>
  );
}
