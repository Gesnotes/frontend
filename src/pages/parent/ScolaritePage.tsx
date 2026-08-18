import {
  BarChart3, BookOpen, Calculator, ChevronDown, ChevronUp, FlaskConical, Globe2, GraduationCap, Landmark,
} from 'lucide-react';
import { useState, type ComponentType } from 'react';

import { parentApi, type ChildDetail, type SubjectResult } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useChildContext } from '../../context/child-context';
import { useTermContext } from '../../context/term-context';
import { formatGrade } from '../../lib/format';
import { EmptyState, Skeleton, gradeTone } from '../../ui';
import { ChildRequired } from './ChildRequired';
import { ChildSwitcher } from './ChildSwitcher';

const TRIM_LABELS = ['1er Trim.', '2ème Trim.', '3ème Trim.'];

function trimLabel(index: number): string {
  return TRIM_LABELS[index] ?? `${index + 1}ème Trim.`;
}

/**
 * Scolarité : reprise fidèle de la structure de l'écran équivalent dans la
 * maquette Flutter (segment 1er/2ème/3ème trimestre + Année, carte moyenne
 * en avant, matières dépliables) — mais avec les couleurs de l'application
 * (bleu #173bab, cartes blanches) plutôt que la palette sombre de la
 * maquette. Le « conseil de classe » et le « bilan annuel » de la maquette
 * portent des textes inventés — on ne les reprend pas, rien ne les nourrit.
 */
export default function ScolaritePage() {
  const { child } = useChildContext();
  const { terms, termId, setTermId } = useTermContext();
  const detail = parentApi.useChildDetail(child?.id, termId);
  const [isYear, setIsYear] = useState(false);

  const termIndex = Math.max(0, terms.findIndex((t) => t.id === termId));
  const selectedIndex = isYear ? terms.length : termIndex;
  const segments = [...terms.map((_, i) => trimLabel(i)), 'Année'];

  function selectSegment(index: number) {
    if (index === terms.length) {
      setIsYear(true);
      return;
    }
    setIsYear(false);
    const term = terms[index];
    if (term) setTermId(term.id);
  }

  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col gap-5 px-4 pb-24 pt-5">
      <header>
        <h1 className="text-xl font-bold text-gray-900">Scolarité</h1>
      </header>

      <ChildRequired>
        <ChildSwitcher />

        {terms.length > 0 ? (
          <TrimSegmentedControl labels={segments} selectedIndex={selectedIndex} onChange={selectSegment} />
        ) : null}

        <QueryBoundary query={detail} loading={<ScolariteSkeleton />}>
          {(data) => (isYear ? <YearRecap data={data} /> : <TrimesterView data={data} />)}
        </QueryBoundary>
      </ChildRequired>
    </main>
  );
}

function TrimSegmentedControl({
  labels, selectedIndex, onChange,
}: { labels: string[]; selectedIndex: number; onChange: (index: number) => void }) {
  return (
    <div className="flex gap-1 rounded-full bg-gray-100 p-1.5">
      {labels.map((label, i) => {
        const active = i === selectedIndex;
        return (
          <button
            key={label}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(i)}
            className={`flex-1 whitespace-nowrap rounded-full px-2 py-2 text-xs font-semibold transition-colors ${
              active ? 'bg-white text-[#173bab] shadow-sm' : 'text-gray-500'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function GeneralAverageCard({
  average, rankText,
}: {
  average: number | null;
  rankText: string | null;
}) {
  return (
    <section className="rounded-2xl bg-gradient-to-br from-[#173bab] to-[#2c4bc7] p-6 text-white shadow-lg shadow-blue-950/10">
      <p className="text-center text-xs font-bold uppercase tracking-wide text-white/70">Moyenne générale</p>
      <div className="mt-2 flex items-end justify-center gap-1.5">
        <span className="text-5xl font-bold leading-none">{formatGrade(average)}</span>
        <span className="pb-1.5 text-lg text-white/70">/20</span>
      </div>
      {rankText ? (
        <div className="mt-3 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-xs font-semibold">
            <BarChart3 size={15} aria-hidden="true" />
            {rankText}
          </span>
        </div>
      ) : null}
    </section>
  );
}

function TrimesterView({ data }: { data: ChildDetail }) {
  return (
    <>
      <GeneralAverageCard
        average={data.average}
        rankText={data.rank ? `Rang : ${data.rank.position}/${data.rank.total}` : null}
      />

      <h2 className="text-base font-semibold text-gray-900">Détail des matières</h2>

      {data.subjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={28} />}
          title="Aucune note pour l'instant"
          description="Les notes apparaîtront ici dès que les enseignants les auront saisies pour cette période."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {data.subjects.map((subject) => (
            <SubjectCard key={subject.subjectId} subject={subject} />
          ))}
        </div>
      )}
    </>
  );
}

const SUBJECT_PALETTE: { icon: ComponentType<{ size?: number; className?: string }>; classes: string }[] = [
  { icon: Calculator, classes: 'bg-violet-50 text-violet-600' },
  { icon: BookOpen, classes: 'bg-blue-50 text-blue-600' },
  { icon: Globe2, classes: 'bg-emerald-50 text-emerald-600' },
  { icon: FlaskConical, classes: 'bg-rose-50 text-rose-600' },
  { icon: Landmark, classes: 'bg-amber-50 text-amber-600' },
];

function subjectStyle(name: string) {
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return SUBJECT_PALETTE[hash % SUBJECT_PALETTE.length]!;
}

function toneAccent(tone: ReturnType<typeof gradeTone>): string {
  if (tone === 'success') return 'text-emerald-500';
  if (tone === 'danger') return 'text-red-500';
  return 'text-gray-300';
}

function SubjectCard({ subject }: { subject: SubjectResult }) {
  const [expanded, setExpanded] = useState(subject.categories.length > 0);
  const style = subjectStyle(subject.subjectName);
  const Icon = style.icon;
  const tone = gradeTone(subject.average);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="flex w-full items-center gap-3 p-3 text-left">
        <span className={`flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-full ${style.classes}`}>
          <Icon size={17} className="shrink-0" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-gray-900">{subject.subjectName}</span>
          <span className="mt-0.5 block text-xs font-semibold text-gray-400">Coeff. {subject.coefficient}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <span className="text-sm font-semibold text-gray-900">{formatGrade(subject.average)}</span>
          <span className="text-xs text-gray-400">/20</span>
          {expanded ? (
            <ChevronUp size={20} className={toneAccent(tone)} aria-hidden="true" />
          ) : (
            <ChevronDown size={20} className={toneAccent(tone)} aria-hidden="true" />
          )}
        </span>
      </button>

      {expanded && subject.categories.length > 0 ? (
        <div className="flex flex-col gap-2.5 border-t border-gray-100 px-3 py-2.5">
          {subject.categories.map((category) => (
            <div key={category.gradeTypeId} className="flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold text-gray-900">{category.label}</span>
                <span className="block text-xs font-semibold text-gray-400">Coefficient {category.weight}</span>
              </span>
              <ScoreChip average={category.average} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ScoreChip({ average }: { average: number | null }) {
  const highlight = gradeTone(average) === 'success';
  return (
    <span
      className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold ${
        highlight ? 'bg-[#dde1ff] text-[#173bab]' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {formatGrade(average)}/20
    </span>
  );
}

function YearRecap({ data }: { data: ChildDetail }) {
  return (
    <>
      <GeneralAverageCard average={data.annualAverage} rankText={null} />

      {data.termTrend.length > 1 ? (
        <>
          <h2 className="text-base font-semibold text-gray-900">Récapitulatif des trimestres</h2>
          <div className="flex flex-col gap-3">
            {data.termTrend.map((point, i) => (
              <TrimesterRecapCard key={point.termId} label={trimLabel(i)} termLabel={point.termLabel} average={point.average} />
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-500">
          Pas assez de périodes rattachées à cette année scolaire pour un récapitulatif.
        </p>
      )}
    </>
  );
}

function TrimesterRecapCard({
  label, termLabel, average,
}: { label: string; termLabel: string; average: number | null }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <span className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-full bg-[#dde1ff] text-[#173bab]">
        <GraduationCap size={17} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-gray-900">{label}</span>
        <span className="mt-0.5 block text-xs font-semibold text-gray-400">{termLabel}</span>
      </span>
      <span className="shrink-0 text-sm font-bold text-gray-900">{formatGrade(average)}/20</span>
    </div>
  );
}

function ScolariteSkeleton() {
  return (
    <>
      <Skeleton height={220} radius={18} />
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={60} radius={16} />
        ))}
      </div>
    </>
  );
}
