import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  classesApi, enrollmentApi, errorMessage, studentsApi,
  type EnrollmentDecisionType, type EnrollmentEntry, type ID,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { formatCount, plural } from '../../lib/format';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import { paths } from '../../routes/paths';
import {
  Alert, Avatar, Button, Card, DataTable, EmptyState, Skeleton, useToast, type Column,
} from '../../ui';

type LocalDecision = 'promotion' | 'redoublement' | 'part';

const DECISIONS: { value: LocalDecision; label: string }[] = [
  { value: 'promotion', label: 'Monte' },
  { value: 'redoublement', label: 'Redouble' },
  { value: 'part', label: 'Part' },
];

type Override = { decision: LocalDecision; toClassId: ID | null };

/**
 * Réinscription en lot depuis une classe.
 *
 * `POST /classes/:id/enrollment-decisions` ne connaît que des déplacements
 * vers une classe réelle — un élève qui « part » n'a pas sa place dans ce
 * lot, il est archivé séparément. Chaque ligne par défaut sur « Monte » vers
 * la classe préparée pour la rentrée suivante quand elle existe.
 */
export default function ClassEnrollmentPage() {
  const { classId } = useParams();
  const id = Number(classId);
  const navigate = useNavigate();
  const toast = useToast();

  const classes = classesApi.useClasses();
  const students = studentsApi.useStudents({ classId: Number.isFinite(id) ? id : undefined });
  const saveEnrollment = enrollmentApi.useSaveEnrollmentDecisions();
  const archiveStudent = studentsApi.useDeleteStudent();

  // Une classe changée en route (retour puis avance dans l'historique) doit
  // repartir de zéro : les choix faits pour une autre classe n'ont pas de sens ici.
  const [scopeKey, setScopeKey] = useState(id);
  const [overrides, setOverrides] = useState<Record<ID, Override>>({});
  if (scopeKey !== id) {
    setScopeKey(id);
    setOverrides({});
  }

  const [invalidIds, setInvalidIds] = useState<Set<ID>>(new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const allClasses = classes.data ?? [];
  const fromClass = allClasses.find((c) => c.id === id) ?? null;
  const defaultTargetId = fromClass?.promotesToId ?? null;
  const defaultTargetClass = defaultTargetId
    ? (allClasses.find((c) => c.id === defaultTargetId) ?? null)
    : null;

  function entryFor(studentId: ID): Override {
    return overrides[studentId] ?? { decision: 'promotion', toClassId: defaultTargetId };
  }

  function setDecision(studentId: ID, decision: LocalDecision) {
    setOverrides((prev) => {
      const current = prev[studentId] ?? { decision: 'promotion', toClassId: defaultTargetId };
      let toClassId = current.toClassId;
      if (decision === 'part') toClassId = null;
      else if (decision === 'redoublement' && toClassId === null) toClassId = id;
      else if (decision === 'promotion' && toClassId === null) toClassId = defaultTargetId;
      return { ...prev, [studentId]: { decision, toClassId } };
    });
    setInvalidIds((prev) => {
      if (!prev.has(studentId)) return prev;
      const next = new Set(prev);
      next.delete(studentId);
      return next;
    });
  }

  function setTarget(studentId: ID, toClassId: ID | null) {
    setOverrides((prev) => ({
      ...prev,
      [studentId]: { decision: prev[studentId]?.decision ?? 'promotion', toClassId },
    }));
    setInvalidIds((prev) => {
      if (!prev.has(studentId)) return prev;
      const next = new Set(prev);
      next.delete(studentId);
      return next;
    });
  }

  async function confirmSubmit(roster: { id: ID }[]) {
    setSubmitError(null);
    const missing = new Set<ID>();
    const entries: EnrollmentEntry[] = [];
    const leaving: ID[] = [];

    for (const student of roster) {
      const entry = entryFor(student.id);
      if (entry.decision === 'part') {
        leaving.push(student.id);
        continue;
      }
      if (!entry.toClassId) {
        missing.add(student.id);
        continue;
      }
      entries.push({
        studentId: student.id,
        toClassId: entry.toClassId,
        decision: entry.decision as EnrollmentDecisionType,
      });
    }

    if (missing.size > 0) {
      setInvalidIds(missing);
      setSubmitError('Choisissez une classe de destination pour chaque élève qui monte ou redouble.');
      return;
    }

    if (entries.length === 0 && leaving.length === 0) {
      setSubmitError('Aucune décision à enregistrer.');
      return;
    }

    setSubmitting(true);
    try {
      const [enrollResult, archiveResults] = await Promise.all([
        entries.length > 0 ? saveEnrollment.mutateAsync({ classId: id, entries }) : Promise.resolve(null),
        Promise.allSettled(leaving.map((studentId) => archiveStudent.mutateAsync({ id: studentId }))),
      ]);

      const archivedCount = archiveResults.filter((r) => r.status === 'fulfilled').length;
      const archiveFailures = archiveResults.length - archivedCount;

      const parts: string[] = [];
      if (enrollResult && enrollResult.moved > 0) {
        parts.push(`${formatCount(enrollResult.moved)} ${plural(enrollResult.moved, 'élève déplacé', 'élèves déplacés')}`);
      }
      if (archivedCount > 0) {
        parts.push(`${formatCount(archivedCount)} ${plural(archivedCount, 'élève sorti', 'élèves sortis')} de l'école`);
      }
      if (parts.length > 0) toast.success(parts.join(' · '));

      if (archiveFailures > 0) {
        toast.error(
          `${formatCount(archiveFailures)} ${plural(archiveFailures, 'sortie', 'sorties')} d'élève n'${archiveFailures > 1 ? 'ont' : 'a'} pas pu être enregistrée${archiveFailures > 1 ? 's' : ''}.`,
        );
      }
      if (enrollResult && enrollResult.skipped.length > 0) {
        toast.error(
          `${formatCount(enrollResult.skipped.length)} ${plural(enrollResult.skipped.length, 'élève', 'élèves')} déjà déplacé${enrollResult.skipped.length > 1 ? 's' : ''} entre-temps, ignoré${enrollResult.skipped.length > 1 ? 's' : ''}.`,
        );
      }

      navigate(paths.admin.classes);
    } catch (cause) {
      setSubmitError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title={fromClass ? `Réinscrire depuis ${fromClass.name}` : 'Réinscription'}
        subtitle="Décidez, pour chaque élève, s'il monte, redouble ou quitte l'école."
        back={
          <Link to={paths.admin.classes}>
            <Button variant="ghost" aria-label="Retour aux classes">‹</Button>
          </Link>
        }
      />
      <PageContent>
        <QueryBoundary query={classes} loading={<TableSkeleton />}>
          {() =>
            fromClass === null ? (
              <EmptyState
                icon="◫"
                title="Classe introuvable"
                description="Cette classe n'existe plus ou a été archivée."
                action={{ label: 'Retour aux classes', onClick: () => navigate(paths.admin.classes) }}
              />
            ) : (
              <QueryBoundary query={students} loading={<TableSkeleton />}>
                {(page) => {
                  const roster = page.students;
                  const summary = roster.reduce(
                    (acc, student) => {
                      acc[entryFor(student.id).decision] += 1;
                      return acc;
                    },
                    { promotion: 0, redoublement: 0, part: 0 } as Record<LocalDecision, number>,
                  );

                  const columns: Column<(typeof roster)[number]>[] = [
                    {
                      key: 'student',
                      header: 'Élève',
                      render: (student) => (
                        <div className="cell-person">
                          <Avatar name={`${student.firstName} ${student.lastName}`} size={32} />
                          <span style={{ fontWeight: 600 }}>
                            {student.firstName} {student.lastName}
                          </span>
                        </div>
                      ),
                    },
                    {
                      key: 'decision',
                      header: 'Décision',
                      render: (student) => {
                        const entry = entryFor(student.id);
                        return (
                          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            {DECISIONS.map((option) => (
                              <Button
                                key={option.value}
                                size="sm"
                                variant={entry.decision === option.value ? 'tonal' : 'secondary'}
                                onClick={() => setDecision(student.id, option.value)}
                              >
                                {option.label}
                              </Button>
                            ))}
                          </div>
                        );
                      },
                    },
                    {
                      key: 'target',
                      header: 'Vers quelle classe',
                      render: (student) => {
                        const entry = entryFor(student.id);
                        if (entry.decision === 'part') {
                          return <span className="t-muted">Sera archivé</span>;
                        }
                        return (
                          <select
                            className="ui-select"
                            aria-label={`Classe de destination pour ${student.firstName} ${student.lastName}`}
                            aria-invalid={invalidIds.has(student.id)}
                            value={entry.toClassId ? String(entry.toClassId) : ''}
                            onChange={(e) =>
                              setTarget(student.id, e.target.value ? Number(e.target.value) : null)
                            }
                          >
                            <option value="">— Choisir —</option>
                            {allClasses.map((c) => (
                              <option key={c.id} value={c.id}>{c.name} ({c.level})</option>
                            ))}
                          </select>
                        );
                      },
                    },
                  ];

                  return (
                    <div className="page-stack">
                      {defaultTargetClass ? (
                        <Alert tone="info">
                          Par défaut, les élèves qui montent partent vers « {defaultTargetClass.name} »,
                          préparée pour la rentrée suivante. Les élèves qui redoublent restent dans «{' '}
                          {fromClass.name} » sauf changement.
                        </Alert>
                      ) : (
                        <Alert tone="info">
                          Aucune classe n'a été préparée pour la rentrée suivante : choisissez une
                          destination pour chaque élève qui monte, ou préparez la rentrée depuis « Années
                          scolaires ».
                        </Alert>
                      )}

                      {submitError ? <Alert tone="danger">{submitError}</Alert> : null}

                      <Card padded>
                        <p className="t-body-md t-muted" style={{ margin: 0 }}>
                          {formatCount(summary.promotion)} monte{summary.promotion > 1 ? 'nt' : ''} ·{' '}
                          {formatCount(summary.redoublement)} redouble{summary.redoublement > 1 ? 'nt' : ''} ·{' '}
                          {formatCount(summary.part)} part{summary.part > 1 ? 'ent' : ''}
                        </p>
                      </Card>

                      <DataTable
                        caption={`Réinscription des élèves de ${fromClass.name}`}
                        columns={columns}
                        rows={roster}
                        rowKey={(student) => String(student.id)}
                        empty={
                          <EmptyState
                            icon="⚇"
                            title="Aucun élève dans cette classe"
                            description="Il n'y a personne à réinscrire depuis cette classe."
                          />
                        }
                      />

                      {roster.length > 0 ? (
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Button loading={submitting} onClick={() => void confirmSubmit(roster)}>
                            Valider la réinscription
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                }}
              </QueryBoundary>
            )
          }
        </QueryBoundary>
      </PageContent>
    </>
  );
}

function TableSkeleton() {
  return (
    <Card padded>
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} height={44} style={{ marginBottom: 12 }} />
      ))}
    </Card>
  );
}
