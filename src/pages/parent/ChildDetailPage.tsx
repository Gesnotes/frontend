import { ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { errorMessage, parentApi, type ChildDetail } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useTermContext } from '../../context/term-context';
import { downloadBlob, safeFilename } from '../../lib/download';
import { formatGrade } from '../../lib/format';
import { Button, Card, Chip, EmptyState, Skeleton, gradeTone, useToast } from '../../ui';
import { ChildRequired } from './ChildRequired';
import { TermPicker } from './TermPicker';

export default function ChildDetailPage() {
  const { childId } = useParams();
  const id = Number(childId);
  const navigate = useNavigate();
  const toast = useToast();
  const { termId, term } = useTermContext();

  const detail = parentApi.useChildDetail(Number.isFinite(id) ? id : undefined, termId);
  const [exporting, setExporting] = useState(false);

  async function exportBulletin() {
    if (termId === undefined || !detail.data) return;
    setExporting(true);
    try {
      const blob = await parentApi.exportChildBulletin(id, termId);
      downloadBlob(
        blob,
        `bulletin-${safeFilename(detail.data.lastName)}-${safeFilename(detail.data.termLabel)}.pdf`,
      );
      toast.success('Bulletin téléchargé');
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="parent__body">
      <header className="parent__topbar">
        <button className="parent__back" onClick={() => navigate(-1)} aria-label="Retour">‹</button>
        <div>
          <h1 className="parent__name">
            {detail.data ? `${detail.data.firstName} ${detail.data.lastName}` : 'Résultats'}
          </h1>
          <p className="parent__greeting">{term?.label ?? ''}</p>
        </div>
      </header>

      <ChildRequired>
        <TermPicker />

        <QueryBoundary query={detail} loading={<DetailSkeleton />}>
          {(data) => (
            <>
              <AverageSummary data={data} />
              <SubjectList data={data} />
              <Button variant="secondary" block loading={exporting} onClick={() => void exportBulletin()}>
                Télécharger le bulletin (PDF)
              </Button>
            </>
          )}
        </QueryBoundary>
      </ChildRequired>
    </main>
  );
}

function AverageSummary({ data }: { data: ChildDetail }) {
  if (data.average === null && data.annualAverage === null) return null;

  return (
    <Card padded>
      <div style={{ display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
        <div>
          <div className="parent__row-meta">Moyenne générale</div>
          <div style={{ fontSize: 'var(--title-md-size)', fontWeight: 800, color: 'var(--on-surface)' }}>
            {formatGrade(data.average)}
          </div>
        </div>
        {data.annualAverage !== null ? (
          <div>
            <div className="parent__row-meta">Moyenne annuelle</div>
            <div style={{ fontSize: 'var(--title-md-size)', fontWeight: 800, color: 'var(--on-surface-variant)' }}>
              {formatGrade(data.annualAverage)}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function SubjectList({ data }: { data: ChildDetail }) {
  if (data.subjects.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList size={28} />}
        title="Aucune note sur cette période"
        description="Choisissez une autre période, ou revenez lorsque les enseignants auront saisi leurs notes."
      />
    );
  }

  return (
    <div className="parent__cards" style={{ gap: 'var(--space-5)' }}>
      {data.subjects.map((subject) => (
        <Card key={subject.subjectId} padded>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)' }}>
            <div>
              <div className="parent__row-title">{subject.subjectName}</div>
              <div className="parent__row-meta">Coefficient {subject.coefficient}</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div
                style={{
                  fontSize: 'var(--title-md-size)',
                  fontWeight: 800,
                  color: `var(--on-surface)`,
                }}
              >
                {formatGrade(subject.average)}
              </div>
              <div className="parent__row-meta">moyenne</div>
            </div>
          </div>

          {/*
            Détail par catégorie : c'est la décomposition que les familles
            demandent quand elles contestent une moyenne, l'interrogation et
            la composition n'ayant pas le même poids.
          */}
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              flexWrap: 'wrap',
              marginTop: 'var(--space-4)',
            }}
          >
            {subject.categories.map((category) => (
              <Chip key={category.gradeTypeId} tone={gradeTone(category.average)}>
                {category.label} · {formatGrade(category.average)} (coef. {category.weight})
              </Chip>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="parent__cards">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} height={120} radius="var(--radius-lg)" />
      ))}
    </div>
  );
}
