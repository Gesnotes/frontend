import { useNavigate } from 'react-router-dom';

import { gradesApi, type TeacherClassAssignment } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useTermContext } from '../../context/term-context';
import { formatCount, formatPercent, plural } from '../../lib/format';
import { InstallCard } from '../../pwa/InstallCard';
import { gradeEntryPath } from '../../routes/paths';
import { Button, Card, Chip, EmptyState, ProgressBar, Skeleton } from '../../ui';

export default function TeacherDashboardPage() {
  const { termId, term } = useTermContext();
  const assignments = gradesApi.useMyClasses(termId);

  return (
    <>
      <div>
        <h1 className="tshell__page-title">Mes classes</h1>
        <p className="tshell__page-subtitle">
          {term ? `Avancement de la saisie · ${term.label}` : 'Avancement de la saisie'}
        </p>
      </div>

      <InstallCard compact />

      <QueryBoundary query={assignments} loading={<CardsSkeleton />}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState
              icon="▦"
              title="Aucune classe affectée"
              description="Votre administration ne vous a pas encore affecté de classe ni de matière. Sans affectation, la saisie de notes n'est pas possible."
            />
          ) : (
            <div className="tcards">
              {items.map((item) => (
                <AssignmentCard key={item.assignmentId} item={item} />
              ))}
            </div>
          )
        }
      </QueryBoundary>
    </>
  );
}

function AssignmentCard({ item }: { item: TeacherClassAssignment }) {
  const navigate = useNavigate();
  const { termId } = useTermContext();

  const done = item.effectif > 0 && item.evalues >= item.effectif;
  const started = item.evalues > 0;
  const ratio = item.effectif === 0 ? null : (item.evalues / item.effectif) * 100;

  return (
    <Card padded>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
        <div>
          <div className="t-title-md">{item.className}</div>
          <div className="t-body-md t-muted">{item.subjectName}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Chip tone={done ? 'success' : started ? 'warning' : 'neutral'}>
            {done ? 'Complet' : started ? 'En cours' : 'Non commencé'}
          </Chip>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          margin: 'var(--space-5) 0 var(--space-2)',
        }}
      >
        <span className="t-body-md t-muted">Élèves évalués</span>
        <span className="t-body-md" style={{ fontWeight: 700 }}>
          {formatCount(item.evalues)} / {formatCount(item.effectif)}
          {ratio !== null ? ` · ${formatPercent(ratio)}` : ''}
        </span>
      </div>

      <ProgressBar
        value={item.evalues}
        max={Math.max(1, item.effectif)}
        tone={done ? 'success' : 'info'}
        label={`Avancement en ${item.subjectName} pour ${item.className}`}
      />

      <p className="t-label-sm t-subtle" style={{ marginTop: 'var(--space-2)', textTransform: 'none' }}>
        {item.effectif === 0
          ? 'Aucun élève inscrit dans cette classe.'
          : `${formatCount(item.effectif - item.evalues)} ${plural(item.effectif - item.evalues, 'élève')} sans note.`}
      </p>

      <Button
        block
        style={{ marginTop: 'var(--space-4)' }}
        disabled={item.effectif === 0 || termId === undefined}
        onClick={() => navigate(gradeEntryPath(item.classId, item.subjectId))}
      >
        Saisir les notes
      </Button>
    </Card>
  );
}

function CardsSkeleton() {
  return (
    <div className="tcards">
      {[0, 1, 2].map((i) => (
        <Card key={i} padded>
          <Skeleton width="45%" height={22} />
          <Skeleton width="60%" height={12} style={{ marginTop: 10 }} />
          <Skeleton height={7} style={{ marginTop: 28 }} />
          <Skeleton height={42} style={{ marginTop: 20 }} />
        </Card>
      ))}
    </div>
  );
}
