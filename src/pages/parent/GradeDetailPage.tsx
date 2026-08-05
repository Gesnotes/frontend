import { useNavigate, useParams } from 'react-router-dom';

import { gradesApi, type ParentGrade } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { formatDate } from '../../lib/format';
import { personName } from '../../lib/text';
import { Avatar, Chip, Skeleton, gradeTone, toneColor } from '../../ui';

export default function GradeDetailPage() {
  const { gradeId } = useParams();
  const id = Number(gradeId);
  const navigate = useNavigate();

  const grade = gradesApi.useGrade(Number.isFinite(id) ? id : undefined);

  return (
    <main className="parent__body">
      <header className="parent__topbar">
        <button className="parent__back" onClick={() => navigate(-1)} aria-label="Retour">‹</button>
        <div>
          <h1 className="parent__name">Détail de la note</h1>
          <p className="parent__greeting">{grade.data?.matiere.name ?? ''}</p>
        </div>
      </header>

      <QueryBoundary
        query={grade}
        errorTitle="Note introuvable"
        loading={<Skeleton height={320} radius="var(--radius-lg)" />}
      >
        {(data) => <GradeBody grade={data} />}
      </QueryBoundary>
    </main>
  );
}

function GradeBody({ grade }: { grade: ParentGrade }) {
  const tone = gradeTone(grade.value, grade.maxValue);
  const color = toneColor(tone);

  return (
    <>
      <section className="parent__grade-hero">
        <div
          className="parent__grade-circle"
          style={{
            background: `color-mix(in srgb, ${color} 14%, transparent)`,
            color,
          }}
        >
          {grade.value}
        </div>
        <span className="t-label-sm t-muted">sur {grade.maxValue}</span>
        <p className="t-title-md" style={{ marginTop: 'var(--space-2)' }}>{grade.evaluation.label}</p>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Chip tone="info">{grade.matiere.name}</Chip>
          <Chip tone="neutral">{grade.type.label}</Chip>
        </div>
      </section>

      <section className="parent__facts">
        <div>
          <span className="parent__fact-label">Date</span>
          <span className="parent__fact-value">{formatDate(grade.createdAt)}</span>
        </div>
        <div>
          <span className="parent__fact-label">Période</span>
          <span className="parent__fact-value">{grade.periode.label}</span>
        </div>
        <div>
          {/*
            Le poids explique pourquoi cette note pèse plus qu'une autre dans
            la moyenne : c'est la première question posée en cas de contestation.
          */}
          <span className="parent__fact-label">Poids du type</span>
          <span className="parent__fact-value">× {grade.type.weight}</span>
        </div>
        <div>
          <span className="parent__fact-label">Enseignant</span>
          <span className="parent__fact-value">
            {personName(grade.professeur, 'Non renseigné')}
          </span>
        </div>
      </section>

      <section>
        <h2 className="parent__section-title" style={{ marginBottom: 'var(--space-3)' }}>
          Commentaire du professeur
        </h2>

        {grade.comment ? (
          <>
            <p className="parent__comment">« {grade.comment} »</p>
            {grade.professeur ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  marginTop: 'var(--space-3)',
                }}
              >
                <Avatar name={personName(grade.professeur)} size={28} brand />
                <span className="parent__row-meta">
                  {personName(grade.professeur)} · {grade.matiere.name}
                </span>
              </div>
            ) : null}
          </>
        ) : (
          <p className="t-body-md t-subtle">Aucun commentaire pour cette note.</p>
        )}
      </section>
    </>
  );
}
