import {
  BarChart3, BookOpen, Calculator, ChevronDown, ChevronRight, ChevronUp, FlaskConical, Globe2, GraduationCap, Landmark,
} from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';

import { errorMessage, parentApi, type ChildDetail, type ID, type ParentGrade, type SubjectResult } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useChildContext } from '../../context/child-context';
import { useTermContext } from '../../context/term-context';
import { downloadBlob, safeFilename } from '../../lib/download';
import { formatGrade } from '../../lib/format';
import { colorForSubject } from '../../lib/schedule';
import { paths } from '../../routes/paths';
import { Alert, Button, EmptyState, Skeleton, gradeTone, toneClasses, useToast } from '../../ui';
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
  const grades = parentApi.useChildGrades(child?.id, { termId });
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
          {(data) =>
            isYear ? (
              <YearRecap data={data} />
            ) : (
              <TrimesterView data={data} grades={grades.data} childId={child!.id} />
            )
          }
        </QueryBoundary>
      </ChildRequired>
    </main>
  );
}

function TrimSegmentedControl({
  labels, selectedIndex, onChange,
}: { labels: string[]; selectedIndex: number; onChange: (index: number) => void }) {
  return (
    <div className="flex gap-1 rounded-full bg-[var(--surface-container-low)] p-1.5">
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

function TrimesterView({
  data, grades, childId,
}: { data: ChildDetail; grades: ParentGrade[] | undefined; childId: ID }) {
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
            <SubjectCard
              key={subject.subjectId}
              subject={subject}
              grades={grades?.filter((grade) => grade.matiere.id === subject.subjectId)}
            />
          ))}
        </div>
      )}

      <BulletinDownload data={data} childId={childId} />
    </>
  );
}

/**
 * Téléchargement du bulletin PDF, mêmes conditions que la fiche enfant
 * (`ChildDetailPage`) : disponible seulement une fois toutes les matières de
 * la classe notées sur la période (`bulletinReady`, calculé côté backend).
 */
function BulletinDownload({ data, childId }: { data: ChildDetail; childId: ID }) {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);

  async function exportBulletin() {
    setExporting(true);
    try {
      const blob = await parentApi.exportChildBulletin(childId, data.termId);
      downloadBlob(blob, `bulletin-${safeFilename(data.lastName)}-${safeFilename(data.termLabel)}.pdf`);
      toast.success('Bulletin téléchargé');
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      {!data.bulletinReady ? (
        <Alert tone="info">
          Le bulletin sera disponible une fois que toutes les matières de la classe
          auront été notées{data.missingSubjects.length > 0 ? ` (reste : ${data.missingSubjects.join(', ')})` : ''}.
        </Alert>
      ) : null}
      <Button
        variant="secondary"
        block
        loading={exporting}
        disabled={!data.bulletinReady}
        onClick={() => void exportBulletin()}
      >
        Télécharger le bulletin (PDF)
      </Button>
    </>
  );
}

/** Icônes tournantes par matière — la couleur, elle, reprend `colorForSubject` (déjà utilisée sur l'emploi du temps). */
const SUBJECT_ICONS: ComponentType<{ size?: number; style?: object }>[] = [
  Calculator, BookOpen, Globe2, FlaskConical, Landmark,
];

function subjectIcon(subjectId: number) {
  return SUBJECT_ICONS[Math.abs(subjectId) % SUBJECT_ICONS.length]!;
}

function toneAccent(tone: ReturnType<typeof gradeTone>): string {
  if (tone === 'success') return 'text-emerald-500';
  if (tone === 'danger') return 'text-red-500';
  return 'text-gray-300';
}

function SubjectCard({ subject, grades }: { subject: SubjectResult; grades: ParentGrade[] | undefined }) {
  const [expanded, setExpanded] = useState(subject.categories.length > 0);
  const Icon = subjectIcon(subject.subjectId);
  const tone = gradeTone(subject.average);
  const color = colorForSubject(subject.subjectId);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="flex w-full items-center gap-3 p-3 text-left">
        <span
          className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}1a` }}
        >
          <Icon size={17} style={{ color }} />
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
        <div className="flex flex-col gap-1 border-t border-gray-100 px-3 py-2.5">
          {subject.categories.map((category) => (
            <CategoryRow
              key={category.gradeTypeId}
              category={category}
              grades={grades?.filter((grade) => grade.type.id === category.gradeTypeId)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** La note la plus récente du type, pour mener directement à sa fiche détaillée. */
function mostRecentGrade(grades: ParentGrade[]): ParentGrade {
  return [...grades].sort((a, b) => (b.evaluation.date ?? '').localeCompare(a.evaluation.date ?? ''))[0]!;
}

function CategoryRow({
  category, grades,
}: { category: SubjectResult['categories'][number]; grades: ParentGrade[] | undefined }) {
  const target = grades && grades.length > 0 ? mostRecentGrade(grades) : undefined;

  const content = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold text-gray-900">{category.label}</span>
        <span className="block text-xs font-semibold text-gray-400">Coefficient {category.weight}</span>
      </span>
      <ScoreChip average={category.average} />
      {target ? <ChevronRight size={16} className="shrink-0 text-gray-300" aria-hidden="true" /> : null}
    </>
  );

  if (!target) {
    return <div className="flex items-center gap-3 py-1.5">{content}</div>;
  }

  return (
    <Link
      to={paths.parent.grade(target.id)}
      className="-mx-1 flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-gray-50"
    >
      {content}
    </Link>
  );
}

function ScoreChip({ average, max = 20 }: { average: number | null; max?: number }) {
  return (
    <span className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold ${toneClasses(gradeTone(average, max))}`}>
      {formatGrade(average)}/{max}
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
