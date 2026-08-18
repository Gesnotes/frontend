import { NotebookPen } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  parentApi, type ChildSummary, type ID, type ParentGrade,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useAuth } from '../../auth/auth-context';
import { useChildContext } from '../../context/child-context';
import { useTermContext } from '../../context/term-context';
import { formatRelative } from '../../lib/format';
import { InstallCard } from '../../pwa/InstallCard';
import { paths } from '../../routes/paths';
import {
  Avatar, Chip, Skeleton, gradeTone,
} from '../../ui';
import { ChildHero, ChildStatsRow } from './ChildHeroStats';
import { ChildRequired } from './ChildRequired';

export default function ParentHomePage() {
  const { displayName } = useAuth();
  const { termId, term } = useTermContext();
  const { child, children, childId, selectChild } = useChildContext();

  const detail = parentApi.useChildDetail(child?.id, termId);

  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col gap-6 px-4 pb-24 pt-5">
      <header>
        <p className="text-sm text-gray-500">Bonjour,</p>
        {/* Titre de niveau 1 de l'écran d'accueil : chaque page doit en
            porter un, et c'est bien ce libellé qui la nomme. */}
        <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
      </header>

      <InstallCard compact />

      <ChildRequired>
        {/* Changer d'enfant se fait ici, comme dans la maquette : une rangée
            d'avatars sur l'accueil, pas un onglet dédié. */}
        {children.length > 1 ? (
          <ChildAvatarRow children={children} activeId={childId} onSelect={selectChild} />
        ) : (
          <ChildBanner child={child} />
        )}

        <QueryBoundary query={detail} loading={<HomeSkeleton />}>
          {(data) => (
            <>
              <ChildHero data={data} child={child} termLabel={term?.label} />
              <ChildStatsRow data={data} />
            </>
          )}
        </QueryBoundary>

        <RecentGradesSection childId={child?.id} termId={termId} />
      </ChildRequired>
    </main>
  );
}

function ChildAvatarRow({
  children, activeId, onSelect,
}: { children: ChildSummary[]; activeId: ID | undefined; onSelect: (id: ID) => void }) {
  return (
    <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Changer d'enfant">
      {children.map((c) => {
        const active = c.id === activeId;
        return (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(c.id)}
            className={`flex w-16 shrink-0 flex-col items-center gap-2 ${active ? '' : 'opacity-60'}`}
          >
            <span
              className={`flex h-15 w-15 items-center justify-center rounded-full border-2 ${
                active ? 'border-[#173bab]' : 'border-transparent'
              }`}
            >
              <Avatar name={`${c.firstName} ${c.lastName}`} size={52} brand={active} />
            </span>
            <span className="w-full truncate text-center text-xs font-semibold text-gray-700">{c.firstName}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Fil des dernières notes de la période, tous statuts confondus — le détail complet vit dans Scolarité. */
function RecentGradesSection({ childId, termId }: { childId: ID | undefined; termId: ID | undefined }) {
  const grades = parentApi.useChildGrades(childId, { termId });

  if (grades.isPending) return <Skeleton height={88} radius={16} />;
  if (grades.isError || !grades.data || grades.data.length === 0) return null;

  const recent = [...grades.data]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, 3);

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900">
        <NotebookPen size={18} className="text-[#173bab]" aria-hidden="true" />
        Dernières notes
      </h2>
      <div className="flex flex-col gap-3">
        {recent.map((grade: ParentGrade) => (
          <Link
            key={grade.id}
            to={paths.parent.grade(grade.id)}
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <Chip tone={gradeTone(grade.value, grade.maxValue)}>{grade.value}/{grade.maxValue}</Chip>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-gray-900">{grade.matiere.name}</span>
              <span className="block text-xs text-gray-500">{grade.type.label} · {formatRelative(grade.createdAt)}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ChildBanner({ child }: { child: ChildSummary | undefined }) {
  if (!child) return null;
  return (
    <p className="text-sm text-gray-500">
      {child.firstName} {child.lastName} · {child.classe.name}
    </p>
  );
}

function HomeSkeleton() {
  return (
    <>
      <Skeleton height={150} radius={24} />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton height={90} radius={16} />
        <Skeleton height={90} radius={16} />
      </div>
    </>
  );
}
