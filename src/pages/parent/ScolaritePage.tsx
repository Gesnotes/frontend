import { BookOpen, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';

import { parentApi } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useChildContext } from '../../context/child-context';
import { useTermContext } from '../../context/term-context';
import { formatGrade } from '../../lib/format';
import { paths } from '../../routes/paths';
import {
  Chip, EmptyState, Skeleton, gradeTone, toneClasses,
} from '../../ui';
import { ChildHero, ChildStatsRow } from './ChildHeroStats';
import { ChildRequired } from './ChildRequired';
import { TermPicker } from './TermPicker';

/**
 * Scolarité : détail des moyennes par matière, période par période —
 * inspirée de l'écran du même nom dans la maquette Flutter (sélecteur de
 * trimestre + détail par matière), séparée de l'accueil pour ne pas y
 * dupliquer une liste déjà longue.
 */
export default function ScolaritePage() {
  const { child } = useChildContext();
  const { termId, term } = useTermContext();

  const detail = parentApi.useChildDetail(child?.id, termId);

  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col gap-6 px-4 pb-24 pt-5">
      <header>
        <h1 className="text-xl font-bold text-gray-900">Scolarité</h1>
        <p className="text-sm text-gray-500">
          {child ? `${child.firstName} ${child.lastName} · ${child.classe.name}` : ''}
        </p>
      </header>

      <ChildRequired>
        <TermPicker />

        <QueryBoundary query={detail} loading={<ScolariteSkeleton />}>
          {(data) => (
            <>
              <ChildHero data={data} child={child} termLabel={term?.label} />
              <ChildStatsRow data={data} />

              <section>
                <div className="mb-3 flex items-baseline gap-3">
                  <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
                    <BookOpen size={18} className="text-[#173bab]" aria-hidden="true" />
                    Par matière
                  </h2>
                  <Link to={paths.parent.grades} className="ml-auto text-sm font-semibold text-[#173bab]">
                    Toutes les notes
                  </Link>
                </div>

                {data.subjects.length === 0 ? (
                  <EmptyState
                    icon={<ClipboardList size={28} />}
                    title="Aucune note pour l'instant"
                    description="Les notes apparaîtront ici dès que les enseignants les auront saisies pour cette période."
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    {data.subjects.map((subject) => {
                      const tone = gradeTone(subject.average);
                      return (
                        <Link
                          key={subject.subjectId}
                          to={paths.parent.child(data.studentId)}
                          className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                        >
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg font-extrabold ${toneClasses(tone)}`}
                          >
                            {subject.average === null ? '—' : Math.round(subject.average)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-gray-900">{subject.subjectName}</span>
                            <span className="block text-xs text-gray-500">Coefficient {subject.coefficient}</span>
                          </span>
                          <Chip tone={tone}>{formatGrade(subject.average)}</Chip>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </QueryBoundary>
      </ChildRequired>
    </main>
  );
}

function ScolariteSkeleton() {
  return (
    <>
      <Skeleton height={150} radius={24} />
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={60} radius={16} />
        ))}
      </div>
    </>
  );
}
