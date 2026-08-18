import { Trophy, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { classesApi, errorMessage, type ID } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { downloadBlob, safeFilename } from '../../lib/download';
import { formatGrade } from '../../lib/format';
import { paths } from '../../routes/paths';
import { Button, Chip, Skeleton, gradeTone, useToast } from '../../ui';

/**
 * Bulletin d'une classe : matières × élèves, moyennes et rangs.
 *
 * Le même bloc sert au tableau de bord, à la liste des classes et à la fiche
 * d'une classe. C'est la vue que l'administration consulte le plus, et la
 * dupliquer aurait garanti trois rendus divergents du même tableau.
 *
 * Le contenu n'est chargé qu'au montage du panneau : sur un écran qui liste
 * toutes les classes de l'école, monter tous les bulletins d'avance ferait
 * autant de calculs complets que de classes, pour un tableau qu'on regarde une
 * classe à la fois.
 */
export function ClassBulletinPanel({
  classId, termId, showBulletinLink = true,
}: {
  classId: ID;
  termId: ID | undefined;
  /** Masqué sur la page bulletin elle-même, où le lien pointerait sur place. */
  showBulletinLink?: boolean;
}) {
  const toast = useToast();
  const bulletin = classesApi.useClassBulletin(classId, termId);
  const [exporting, setExporting] = useState(false);

  async function exportCsv(className: string, termLabel: string) {
    if (termId === undefined) return;
    setExporting(true);
    try {
      const blob = await classesApi.exportClassBulletinCsv(classId, termId);
      downloadBlob(blob, `${safeFilename(className)}-${safeFilename(termLabel)}.csv`);
      toast.success('Bulletin exporté');
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="dash-bulletin">
      <QueryBoundary query={bulletin} loading={<PanelSkeleton />}>
        {(detail) => {
          // Le backend ne renvoie que les matières réellement notées, et chaque
          // élève porte la même liste : la lire sur le premier évite les
          // colonnes fantômes.
          const subjects = detail.students[0]?.subjects ?? [];
          const noted = detail.students.filter((s) => s.average !== null);
          const bestId = noted[0]?.studentId;
          const worstId = noted.length > 1 ? noted[noted.length - 1]?.studentId : undefined;

          if (subjects.length === 0) {
            return (
              <p className="t-body-md t-muted">
                Aucune note sur cette période : le tableau apparaîtra dès les premières saisies
                des enseignants.
              </p>
            );
          }

          return (
            <>
              <div className="dash-bulletin__scroll">
                <table className="ui-table">
                  <caption className="sr-only">
                    Bulletin de {detail.className} pour {detail.termLabel}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Élève</th>
                      {subjects.map((subject) => (
                        <th key={subject.subjectId} scope="col" className="is-center">
                          <span title={`Coefficient ${subject.coefficient}`}>
                            {subject.subjectName}
                          </span>
                        </th>
                      ))}
                      <th scope="col" className="is-center">Moyenne</th>
                      <th scope="col" className="is-numeric">Rang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.students.map((student) => (
                      <tr key={student.studentId}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {student.lastName} {student.firstName}
                        </td>
                        {subjects.map((subject) => {
                          const value = student.subjects.find(
                            (s) => s.subjectId === subject.subjectId,
                          )?.average;
                          return (
                            <td key={subject.subjectId} className="is-center">
                              <Chip tone={gradeTone(value)}>{formatGrade(value)}</Chip>
                            </td>
                          );
                        })}
                        <td className="is-center" style={{ fontWeight: 800 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {formatGrade(student.average)}
                            {student.studentId === bestId ? (
                              <Trophy size={13} aria-label="Meilleure moyenne de la classe" style={{ color: 'var(--warning, #d97706)' }} />
                            ) : null}
                            {student.studentId === worstId ? (
                              <TrendingDown size={13} aria-label="Moyenne la plus faible de la classe" style={{ color: 'var(--error, #dc2626)' }} />
                            ) : null}
                          </span>
                        </td>
                        <td className="is-numeric">{student.rang ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="dash-bulletin__actions">
                {showBulletinLink ? (
                  <Link to={paths.admin.classBulletin(classId)}>
                    <Button size="sm" variant="secondary">Bulletin complet</Button>
                  </Link>
                ) : null}
                <Button
                  size="sm"
                  variant="tonal"
                  loading={exporting}
                  onClick={() => void exportCsv(detail.className, detail.termLabel)}
                >
                  Exporter en CSV
                </Button>
              </div>
            </>
          );
        }}
      </QueryBoundary>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="page-stack" style={{ gap: 'var(--space-3)' }}>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} height={32} />
      ))}
    </div>
  );
}
