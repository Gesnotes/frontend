import { Link } from 'react-router-dom';

import { parentApi, type ParentGrade } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useChildContext } from '../../context/child-context';
import { useTermContext } from '../../context/term-context';
import { formatCount, formatDateShort, plural } from '../../lib/format';
import { paths } from '../../routes/paths';
import { Chip, EmptyState, Skeleton, gradeTone } from '../../ui';
import { ChildRequired } from './ChildRequired';
import { TermPicker } from './TermPicker';

export default function GradesHistoryPage() {
  const { termId } = useTermContext();
  const { child } = useChildContext();

  const grades = parentApi.useChildGrades(child?.id, { termId });

  return (
    <main className="parent__body">
      <header className="parent__topbar">
        <div>
          <h1 className="parent__name">Notes</h1>
          <p className="parent__greeting">
            {child ? `${child.firstName} ${child.lastName} · ${child.classe.name}` : ''}
          </p>
        </div>
      </header>

      <ChildRequired>
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
        icon="▤"
        title="Aucune note sur cette période"
        description="Vous serez notifié dès qu'un enseignant saisira une note."
      />
    );
  }

  return (
    <section>
      <p className="t-body-md t-muted" style={{ marginBottom: 'var(--space-4)' }}>
        {formatCount(grades.length)} {plural(grades.length, 'note')}
      </p>

      <div className="parent__cards">
        {grades.map((grade) => (
          <Link
            key={grade.id}
            to={paths.parent.grade(grade.id)}
            className="ui-card ui-card--interactive parent__row"
            style={{ color: 'inherit' }}
          >
            <Chip tone={gradeTone(grade.value, grade.maxValue)}>
              {grade.value} / {grade.maxValue}
            </Chip>
            <span className="parent__row-body">
              <span className="parent__row-title">{grade.matiere.name}</span>
              <span className="parent__row-meta">
                {grade.evaluation.label} · {grade.type.label} ·{' '}
                {formatDateShort(grade.evaluation.date ?? grade.createdAt)}
                {grade.comment ? ' · commentaire' : ''}
              </span>
            </span>
            <span className="parent__chevron" aria-hidden="true">›</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ListSkeleton() {
  return (
    <div className="parent__cards">
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} height={76} radius="var(--radius-lg)" />
      ))}
    </div>
  );
}
