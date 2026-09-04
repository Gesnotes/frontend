import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { classesApi, evaluationsApi, gradesApi, referentialsApi } from '../../api';
import { useAuth } from '../../auth/auth-context';
import { QueryBoundary } from '../../components/QueryBoundary';
import { formatCount, formatDate, plural } from '../../lib/format';
import { evaluationGradingPath } from '../../routes/paths';
import { Button, Card, Chip, DataTable, EmptyState, Skeleton, type Column } from '../../ui';
import type { UpcomingEvaluation } from '../../api/types';

/**
 * Calendrier transversal des évaluations programmées à venir (devoir,
 * composition, examen blanc… tout type de note configuré par l'école — voir
 * Réglages → Types de note, cette page-ci ne fait qu'afficher ce qui existe
 * déjà). Écran de lecture seule : la création reste dans l'écran de saisie,
 * via « Nouvelle évaluation ».
 *
 * Monté sur les deux arbres de routes (admin et enseignant), comme
 * `AnnoncesIncidentsPage.tsx` — même page, `role` branche ce qui diverge.
 */
export default function UpcomingEvaluationsPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isTeacher = role === 'teacher';

  const upcomingQuery = evaluationsApi.useUpcomingEvaluations();
  const gradeTypesQuery = referentialsApi.useGradeTypes();

  const adminClassesQuery = classesApi.useClasses();
  const teacherClassesQuery = gradesApi.useMyClasses();

  const availableClasses = isTeacher
    ? teacherClassesQuery.data
      ? Array.from(
          new Map(
            teacherClassesQuery.data.map((a) => [a.classId, { id: a.classId, name: a.className }]),
          ).values(),
        )
      : []
    : (adminClassesQuery.data ?? []).map((c) => ({ id: c.id, name: c.name }));

  const [classFilter, setClassFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const items = upcomingQuery.data;
  const filtered = useMemo(
    () =>
      (items ?? []).filter((item) => {
        if (classFilter && String(item.classId) !== classFilter) return false;
        if (typeFilter && String(item.type.id) !== typeFilter) return false;
        return true;
      }),
    [items, classFilter, typeFilter],
  );

  const columns: Column<UpcomingEvaluation>[] = [
    { key: 'date', header: 'Date', render: (e) => formatDate(e.date) },
    { key: 'classe', header: 'Classe', render: (e) => e.class.name },
    { key: 'matiere', header: 'Matière', render: (e) => e.subject.name },
    { key: 'type', header: 'Type', render: (e) => <Chip tone="info">{e.type.label}</Chip> },
    { key: 'label', header: 'Intitulé', render: (e) => e.label },
    {
      key: 'actions',
      srHeader: 'Actions',
      align: 'numeric',
      render: (e) => (
        <Button
          size="sm"
          variant="tonal"
          onClick={() => navigate(evaluationGradingPath('admin', e.classId, e.subjectId, e.id))}
        >
          Ouvrir
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-4 border-b border-gray-100 bg-white px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Évaluations à venir</h1>
          <p className="mt-1 text-sm text-gray-500">
            {upcomingQuery.data
              ? `${formatCount(upcomingQuery.data.length)} ${plural(upcomingQuery.data.length, 'évaluation')} à venir`
              : 'Le calendrier des devoirs, compositions et examens programmés'}
          </p>
        </div>
      </div>

      <div className="space-y-6 p-4 sm:p-8">
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <select
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="">Toutes les classes</option>
            {availableClasses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">Tous les types</option>
            {(gradeTypesQuery.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        <QueryBoundary query={upcomingQuery} loading={<TableSkeleton />}>
          {() =>
            filtered.length === 0 ? (
              <EmptyState
                icon="🗓"
                title="Aucune évaluation à venir"
                description="Programmez un devoir, une composition ou un examen blanc depuis Saisie des notes pour qu'il apparaisse ici."
              />
            ) : isTeacher ? (
              // Un tableau à six colonnes ne passe pas dans la colonne mobile
              // (640px max) de `TeacherShell` — une carte par évaluation, comme
              // `AnnoncesIncidentsPage.tsx`, plutôt qu'un défilement horizontal.
              <div className="space-y-3">
                {filtered.map((e) => (
                  <Card key={e.id} padded>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Chip tone="info">{e.type.label}</Chip>
                          <span className="text-xs text-gray-500">{formatDate(e.date)}</span>
                        </div>
                        <p className="mt-1 truncate font-semibold text-gray-900">{e.label}</p>
                        <p className="text-sm text-gray-500">{e.class.name} · {e.subject.name}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="tonal"
                        onClick={() => navigate(evaluationGradingPath('teacher', e.classId, e.subjectId, e.id))}
                      >
                        Ouvrir
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <DataTable
                caption="Évaluations à venir"
                columns={columns}
                rows={filtered}
                rowKey={(e) => String(e.id)}
              />
            )
          }
        </QueryBoundary>
      </div>
    </>
  );
}

function TableSkeleton() {
  return (
    <Card padded>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} height={44} style={{ marginBottom: 12 }} />
      ))}
    </Card>
  );
}
