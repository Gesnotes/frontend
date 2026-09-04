import { AlertTriangle, Bell, CheckCheck, Megaphone, NotebookPen, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

import { errorMessage, notificationsApi, parentApi, type ID, type ParentGrade } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useAuth } from '../../auth/auth-context';
import { useChildContext } from '../../context/child-context';
import { useTermContext } from '../../context/term-context';
import { formatRelative } from '../../lib/format';
import { InstallCard } from '../../pwa/InstallCard';
import { paths } from '../../routes/paths';
import { Chip, Skeleton, gradeTone, useToast } from '../../ui';
import { ChildHero, ChildStatsRow } from './ChildHeroStats';
import { ChildRequired } from './ChildRequired';
import { ChildSwitcher } from './ChildSwitcher';

export default function ParentHomePage() {
  const { displayName } = useAuth();
  const { termId, term } = useTermContext();
  const { child } = useChildContext();

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

      <UnreadAnnouncementsSection />

      <ChildRequired>
        <ChildSwitcher />

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

function UnreadAnnouncementsSection() {
  const notificationsQuery = notificationsApi.useNotifications(true); // non lues uniquement
  const markRead = notificationsApi.useMarkNotificationRead();
  const toast = useToast();

  const items = notificationsQuery.data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
          <Megaphone size={18} className="text-amber-600" aria-hidden="true" />
          Annonces non lues
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
            {items.length}
          </span>
        </h2>
        <Link to={paths.parent.notifications} className="text-xs font-semibold text-[#173bab] hover:underline">
          Tout voir
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {items.slice(0, 3).map((item) => (
          <div
            key={item.recipientId}
            className={`flex flex-col gap-2 rounded-2xl border-l-4 p-4 shadow-sm ${
              item.type === 'incident'
                ? 'border-red-500 bg-red-50/50'
                : item.type === 'convocation'
                ? 'border-amber-500 bg-amber-50/50'
                : item.type === 'rappel'
                ? 'border-gray-400 bg-gray-50/50'
                : 'border-blue-500 bg-blue-50/50'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {item.type === 'incident' ? (
                  <ShieldAlert size={18} className="text-red-500" />
                ) : item.type === 'convocation' ? (
                  <AlertTriangle size={18} className="text-amber-500" />
                ) : item.type === 'rappel' ? (
                  <Bell size={18} className="text-gray-500" />
                ) : (
                  <Megaphone size={18} className="text-blue-500" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  {item.type === 'incident'
                    ? '🚨 Incident'
                    : item.type === 'convocation'
                    ? '⚠️ Convocation'
                    : item.type === 'rappel'
                    ? '🔔 Rappel'
                    : '📢 Annonce'}
                </span>
              </div>
              <span className="text-[11px] text-gray-400">{formatRelative(item.createdAt)}</span>
            </div>

            <h3 className="font-bold text-gray-900">{item.title}</h3>
            <p className="text-sm text-gray-700 line-clamp-2">{item.body}</p>

            <div className="mt-1 flex items-center justify-between border-t border-gray-200/60 pt-2">
              <span className="text-xs text-gray-500">De : {item.creatorName}</span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await markRead.mutateAsync(item.id);
                    toast.success('Marqué comme lu');
                  } catch (e) {
                    toast.error(errorMessage(e));
                  }
                }}
                className="flex items-center gap-1 text-xs font-semibold text-[#173bab] hover:underline"
              >
                <CheckCheck size={14} /> Marquer comme lu
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
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
