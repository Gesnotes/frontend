import { ChevronLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { gradesApi, type ParentGrade } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { formatDate } from '../../lib/format';
import { personName } from '../../lib/text';
import { Avatar, Chip, Skeleton, gradeTone, toneClasses } from '../../ui';

export default function GradeDetailPage() {
  const { gradeId } = useParams();
  const id = Number(gradeId);
  const navigate = useNavigate();

  const grade = gradesApi.useGrade(Number.isFinite(id) ? id : undefined);

  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col gap-6 px-4 pb-24 pt-5">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Retour"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Détail de la note</h1>
          <p className="text-sm text-gray-500">{grade.data?.matiere.name ?? ''}</p>
        </div>
      </header>

      <QueryBoundary
        query={grade}
        errorTitle="Note introuvable"
        loading={<Skeleton height={320} radius={20} />}
      >
        {(data) => <GradeBody grade={data} />}
      </QueryBoundary>
    </main>
  );
}

function GradeBody({ grade }: { grade: ParentGrade }) {
  const tone = gradeTone(grade.value, grade.maxValue);

  return (
    <>
      <section className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div
          className={`flex h-28 w-28 items-center justify-center rounded-full text-4xl font-extrabold tracking-tight ${toneClasses(tone)}`}
        >
          {grade.value}
        </div>
        <span className="text-xs font-semibold text-gray-400">sur {grade.maxValue}</span>
        <p className="mt-2 text-base font-bold text-gray-900">{grade.evaluation.label}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Chip tone="info">{grade.matiere.name}</Chip>
          <Chip tone="neutral">{grade.type.label}</Chip>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <Fact label="Date" value={formatDate(grade.createdAt)} />
        <Fact label="Période" value={grade.periode.label} />
        {/*
          Le poids explique pourquoi cette note pèse plus qu'une autre dans
          la moyenne : c'est la première question posée en cas de contestation.
        */}
        <Fact label="Poids du type" value={`× ${grade.type.weight}`} />
        <Fact label="Enseignant" value={personName(grade.professeur, 'Non renseigné')} />
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold text-gray-900">Commentaire du professeur</h2>

        {grade.comment ? (
          <>
            <p className="rounded-xl border border-gray-100 bg-white p-4 italic leading-relaxed text-gray-700 shadow-sm">
              « {grade.comment} »
            </p>
            {grade.professeur ? (
              <div className="mt-3 flex items-center gap-2">
                <Avatar name={personName(grade.professeur)} size={28} brand />
                <span className="text-xs text-gray-500">
                  {personName(grade.professeur)} · {grade.matiere.name}
                </span>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-gray-400">Aucun commentaire pour cette note.</p>
        )}
      </section>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <span className="mt-0.5 block text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}
