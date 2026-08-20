import { GraduationCap, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  gradesApi, studentsApi, type ID, type TeacherClassAssignment,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useTermContext } from '../../context/term-context';
import { formatCount, plural } from '../../lib/format';
import { paths } from '../../routes/paths';
import {
  Avatar, EmptyState, ErrorState, Skeleton,
} from '../../ui';
import { ClassBulletinPanel } from '../admin/ClassBulletinPanel';

/**
 * Élèves du professeur : la classe est choisie d'abord (comme la saisie et la
 * présence), puis on retrouve le même tableau de moyennes par matière que
 * l'administration (`ClassBulletinPanel`, déjà accessible au professeur côté
 * backend) et la liste de ses élèves, chacun menant à sa fiche.
 */
export default function TeacherStudentsPage() {
  const { termId } = useTermContext();
  const assignments = gradesApi.useMyClasses(termId);
  const [pickedClassId, setPickedClassId] = useState<ID | null>(null);

  return (
    <>
      <div>
        <h1 className="tshell__page-title">Élèves</h1>
        <p className="tshell__page-subtitle">Vos classes, leurs moyennes et leurs élèves</p>
      </div>

      <QueryBoundary
        query={assignments}
        loading={<Skeleton height={72} radius="var(--radius-lg)" />}
      >
        {(data) => {
          const classes = dedupeClasses(data);

          if (classes.length === 0) {
            return (
              <EmptyState
                icon={<Users size={28} />}
                title="Aucune classe affectée"
                description="Sans affectation classe × matière, vous n'avez accès à aucun élève."
              />
            );
          }

          const single = classes.length === 1 ? classes[0]! : undefined;
          const picked = single ?? classes.find((c) => c.classId === pickedClassId);

          if (!picked) {
            return <ClassPicker classes={classes} onPick={setPickedClassId} />;
          }

          return (
            <div className="page-stack" style={{ gap: 'var(--space-4)' }}>
              {single ? null : (
                <button className="tsaisie-back" onClick={() => setPickedClassId(null)}>
                  ← Changer de classe
                </button>
              )}
              <div>
                <h2 className="parent__section-title" style={{ marginBottom: 'var(--space-3)' }}>
                  {picked.className} · moyennes par matière
                </h2>
                <ClassBulletinPanel classId={picked.classId} termId={termId} showBulletinLink={false} />
              </div>
              <StudentList classId={picked.classId} />
            </div>
          );
        }}
      </QueryBoundary>
    </>
  );
}

function dedupeClasses(assignments: TeacherClassAssignment[]): TeacherClassAssignment[] {
  return Array.from(new Map(assignments.map((a) => [a.classId, a])).values());
}

function ClassPicker({
  classes, onPick,
}: { classes: TeacherClassAssignment[]; onPick: (classId: ID) => void }) {
  return (
    <section>
      <h2 className="parent__section-title" style={{ marginBottom: 'var(--space-3)' }}>
        Quelle classe ?
      </h2>
      <div className="tcards">
        {classes.map((item) => (
          <button key={item.classId} type="button" className="tpick" onClick={() => onPick(item.classId)}>
            <span className="tpick__body">
              <span className="tpick__title">{item.className}</span>
              <span className="tpick__meta">
                Niveau {item.level} · {formatCount(item.effectif)} {plural(item.effectif, 'élève')}
              </span>
            </span>
            <span className="tpick__chevron" aria-hidden="true">›</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function StudentList({ classId }: { classId: ID }) {
  const students = studentsApi.useStudents({ classId });

  return (
    <section>
      <h2 className="parent__section-title" style={{ marginBottom: 'var(--space-3)' }}>
        Élèves
      </h2>

      {students.isPending ? (
        <Skeleton height={220} radius="var(--radius-lg)" />
      ) : students.isError ? (
        <ErrorState onRetry={() => void students.refetch()} retrying={students.isRefetching} />
      ) : students.data.students.length === 0 ? (
        <EmptyState
          icon={<GraduationCap size={28} />}
          title="Aucun élève inscrit"
          description="Cette classe n'a pas encore d'élève inscrit."
        />
      ) : (
        <div className="tcards">
          {students.data.students.map((student) => (
            <Link
              key={student.id}
              to={paths.teacher.studentDetail(student.id)}
              className="tpick"
            >
              <span className="tpick__body cell-person">
                <Avatar name={`${student.firstName} ${student.lastName}`} size={32} />
                <span className="tpick__title">{student.firstName} {student.lastName}</span>
              </span>
              <span className="tpick__chevron" aria-hidden="true">›</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
