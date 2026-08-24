import { Award, TrendingUp } from 'lucide-react';

import type { ChildDetail, ChildSummary } from '../../api';
import { formatCount, formatGrade, plural } from '../../lib/format';
import { StatCardIcon } from '../../ui';

/** Carte « moyenne générale » de la période — partagée entre l'accueil et Scolarité. */
export function ChildHero({
  data, child, termLabel,
}: { data: ChildDetail; child: ChildSummary | undefined; termLabel: string | undefined }) {
  const noted = data.subjects.filter((subject) => subject.average !== null);

  return (
    <section className="rounded-2xl bg-gradient-to-br from-[#173bab] to-[#2c4bc7] p-6 text-white shadow-lg shadow-blue-950/10">
      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
        {termLabel ?? data.termLabel}
      </span>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-5xl font-bold">{formatGrade(data.average)}</span>
        <span className="text-lg text-white/70">/ 20</span>
      </div>
      <p className="mt-1 text-sm text-white/70">
        {noted.length === 0
          ? 'Aucune note sur cette période'
          : `${formatCount(noted.length)} ${plural(noted.length, 'matière')} notée${noted.length > 1 ? 's' : ''}`}
      </p>
      {child ? (
        <div className="mt-4 border-t border-white/15 pt-4">
          <p className="font-semibold">{data.firstName} {data.lastName}</p>
          <p className="text-sm text-white/70">{child.classe.name}</p>
        </div>
      ) : null}
    </section>
  );
}

/** Rang de classe + moyenne annuelle — partagés entre l'accueil et Scolarité. */
export function ChildStatsRow({ data }: { data: ChildDetail }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCardIcon
        icon={Award}
        tone="bg-amber-50 text-amber-600"
        label="Rang"
        value={data.rank ? `${data.rank.position} / ${data.rank.total}` : '—'}
      />
      <StatCardIcon
        icon={TrendingUp}
        tone="bg-[#dde1ff] text-[#173bab]"
        label="Moyenne annuelle"
        value={formatGrade(data.annualAverage)}
      />
    </div>
  );
}
