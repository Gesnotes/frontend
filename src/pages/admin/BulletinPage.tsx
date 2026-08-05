import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  classesApi, errorMessage, type BulletinExportFormat, type ClassDetail, type RankedStudentResult,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useTermContext } from '../../context/term-context';
import { downloadBlob, safeFilename } from '../../lib/download';
import { formatGrade } from '../../lib/format';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import { TermSelect } from '../../layouts/TermSelect';
import { paths } from '../../routes/paths';
import {
  Button, Card, Chip, DataTable, EmptyState, Skeleton, gradeTone, useToast, type Column,
} from '../../ui';
import { TermRequired } from './TermRequired';

export default function BulletinPage() {
  const { classId } = useParams();
  const id = Number(classId);
  const { termId, term } = useTermContext();
  const toast = useToast();

  const bulletin = classesApi.useClassBulletin(Number.isFinite(id) ? id : undefined, termId);
  const [exporting, setExporting] = useState<BulletinExportFormat | 'csv' | null>(null);

  /**
   * Rien à imprimer tant qu'aucune note n'est saisie.
   *
   * Le calcul agrège toute la classe et la mise en page ouvre une page par
   * élève : produire ce document sur une période vide coûte cher pour un PDF
   * rempli de tirets. Le backend refuse aussi, cette garde évite l'aller-retour
   * et surtout le bouton qui promet un export impossible.
   */
  const printable = Boolean(
    bulletin.data?.students.some((student) => student.subjects.length > 0),
  );

  async function exportPdf(format: BulletinExportFormat) {
    if (termId === undefined || !bulletin.data) return;
    setExporting(format);
    try {
      const blob = await classesApi.exportClassBulletin(id, termId, format);
      const suffix = format === 'eleves' ? 'bulletins' : 'synthese';
      downloadBlob(
        blob,
        `${safeFilename(bulletin.data.className)}-${safeFilename(bulletin.data.termLabel)}-${suffix}.pdf`,
      );
      toast.success('Bulletin téléchargé');
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setExporting(null);
    }
  }

  /** Le PDF se remet aux familles ; le CSV se retravaille dans un tableur. */
  async function exportCsv() {
    if (termId === undefined || !bulletin.data) return;
    setExporting('csv');
    try {
      const blob = await classesApi.exportClassBulletinCsv(id, termId);
      downloadBlob(
        blob,
        `${safeFilename(bulletin.data.className)}-${safeFilename(bulletin.data.termLabel)}.csv`,
      );
      toast.success('Bulletin exporté');
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setExporting(null);
    }
  }

  return (
    <>
      <PageHeader
        title={`Bulletin · ${bulletin.data?.className ?? ''}`}
        subtitle={term ? `${term.label} · moyennes par matière` : 'Moyennes par matière'}
        back={
          <Link to={paths.admin.classDetail(id)}>
            <Button variant="ghost" aria-label="Retour à la classe">‹</Button>
          </Link>
        }
        actions={
          <>
            <TermSelect />
            <Button
              variant="tonal"
              loading={exporting === 'csv'}
              disabled={!printable}
              title={printable ? undefined : 'Aucune note sur cette période.'}
              onClick={() => void exportCsv()}
            >
              Export CSV
            </Button>
            <Button
              variant="secondary"
              loading={exporting === 'classe'}
              disabled={!printable}
              title={printable ? undefined : 'Aucune note sur cette période.'}
              onClick={() => void exportPdf('classe')}
            >
              Synthèse PDF
            </Button>
            <Button
              loading={exporting === 'eleves'}
              disabled={!printable}
              title={printable ? undefined : 'Aucune note sur cette période.'}
              onClick={() => void exportPdf('eleves')}
            >
              Bulletins élèves
            </Button>
          </>
        }
      />
      <PageContent>
        <TermRequired>
          <QueryBoundary query={bulletin} loading={<TableSkeleton />}>
            {(data) => <BulletinTable data={data} />}
          </QueryBoundary>
        </TermRequired>
      </PageContent>
    </>
  );
}

function BulletinTable({ data }: { data: ClassDetail }) {
  /**
   * Colonnes de matières.
   *
   * Le backend ne renvoie que les matières réellement notées, et chaque élève
   * porte la même liste : on la lit sur le premier élève plutôt que d'unir
   * toutes les listes, ce qui produirait des colonnes fantômes.
   */
  const subjects = useMemo(() => data.students[0]?.subjects ?? [], [data.students]);

  const columns: Column<RankedStudentResult>[] = useMemo(() => {
    const base: Column<RankedStudentResult>[] = [
      {
        key: 'student',
        header: 'Élève',
        render: (student) => (
          <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
            {student.firstName} {student.lastName}
          </span>
        ),
      },
    ];

    const subjectColumns: Column<RankedStudentResult>[] = subjects.map((subject) => ({
      key: `subject-${subject.subjectId}`,
      header: (
        <span title={`Coefficient ${subject.coefficient}`}>
          {subject.subjectName}
          <span style={{ color: 'var(--outline)', fontWeight: 500 }}> ×{subject.coefficient}</span>
        </span>
      ),
      align: 'center',
      render: (student) => {
        const value = student.subjects.find((s) => s.subjectId === subject.subjectId)?.average;
        return <Chip tone={gradeTone(value)}>{formatGrade(value)}</Chip>;
      },
    }));

    return [
      ...base,
      ...subjectColumns,
      {
        key: 'overall',
        header: 'Moyenne',
        align: 'center',
        render: (student) => (
          <span style={{ fontWeight: 800, color: 'var(--on-surface)' }}>
            {formatGrade(student.average)}
          </span>
        ),
      },
      {
        key: 'rank',
        header: 'Rang',
        align: 'numeric',
        render: (student) => student.rang ?? '—',
      },
    ];
  }, [subjects]);

  if (data.students.length === 0) {
    return (
      <EmptyState
        icon="▤"
        title="Aucun élève dans cette classe"
        description="Le bulletin sera disponible dès que des élèves y seront inscrits."
      />
    );
  }

  if (subjects.length === 0) {
    return (
      <EmptyState
        icon="✎"
        title="Aucune note sur cette période"
        description="Les moyennes apparaîtront ici dès que les enseignants auront saisi des notes."
      />
    );
  }

  return (
    <div className="page-stack">
      <p className="t-body-md t-muted">
        Moyenne de la classe :{' '}
        <strong style={{ color: 'var(--on-surface)' }}>{formatGrade(data.classAverage)} / 20</strong>
      </p>
      <DataTable
        caption={`Bulletin de ${data.className} pour ${data.termLabel}`}
        columns={columns}
        rows={data.students}
        rowKey={(student) => String(student.studentId)}
      />
    </div>
  );
}

function TableSkeleton() {
  return (
    <Card padded>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton key={i} height={38} style={{ marginBottom: 12 }} />
      ))}
    </Card>
  );
}
