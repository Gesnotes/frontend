import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { classesApi, type ClassDetail, type ID, type RankedStudentResult } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useTermContext } from '../../context/term-context';
import { formatCount, formatGrade } from '../../lib/format';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import { TermSelect } from '../../layouts/TermSelect';
import { paths } from '../../routes/paths';
import {
  Avatar, Button, Card, Chip, DataTable, EmptyState, ProgressBar, SectionTitle, Skeleton,
  StatTile, Tabs, TabPanel, gradeTone, type Column, type TabItem,
} from '../../ui';
import { ClassBulletinPanel } from './ClassBulletinPanel';
import { ClassSchedulePanel } from './ClassSchedulePanel';
import { ClassSubjectsPanel } from './ClassSubjectsPanel';
import { TermRequired } from './TermRequired';

type TabKey = 'vue' | 'eleves' | 'matieres' | 'emploi';

export default function ClassDetailPage() {
  const { classId } = useParams();
  const id = Number(classId);
  const { termId, term } = useTermContext();

  const detail = classesApi.useClassDetail(
    Number.isFinite(id) ? id : undefined,
    termId,
  );

  return (
    <>
      <PageHeader
        title={detail.data?.className ?? 'Classe'}
        subtitle={
          detail.data
            ? `Niveau ${detail.data.level} · ${term?.label ?? ''}`
            : 'Résultats de la classe'
        }
        back={
          <Link to={paths.admin.classes}>
            <Button variant="ghost" aria-label="Retour aux classes">‹</Button>
          </Link>
        }
        actions={
          <>
            <TermSelect />
            <Link to={paths.admin.classEnrollment(id)}>
              <Button variant="secondary">Réinscrire</Button>
            </Link>
            <Link to={paths.admin.classBulletin(id)}>
              <Button variant="secondary">Bulletin de classe</Button>
            </Link>
          </>
        }
      />
      <PageContent>
        <TermRequired>
          <QueryBoundary query={detail} loading={<DetailSkeleton />}>
            {(data) => <ClassBody data={data} termId={termId} />}
          </QueryBoundary>
        </TermRequired>
      </PageContent>
    </>
  );
}

function ClassBody({ data, termId }: { data: ClassDetail; termId: ID | undefined }) {
  const { stats } = data;
  const hasSchedule = data.mode === 'notes';

  const [tab, setTab] = useState<TabKey>('vue');

  const items: TabItem[] = [
    { key: 'vue', label: "Vue d'ensemble" },
    { key: 'eleves', label: 'Élèves', badge: formatCount(stats.effectif) },
    { key: 'matieres', label: 'Matières' },
    ...(hasSchedule ? [{ key: 'emploi', label: 'Emploi du temps' } as TabItem] : []),
  ];

  const columns: Column<RankedStudentResult>[] = [
    {
      key: 'rank',
      header: '#',
      width: 56,
      render: (student) => (
        <span style={{ fontWeight: 700, color: 'var(--outline)' }}>{student.rang ?? '—'}</span>
      ),
    },
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
      key: 'average',
      header: 'Moyenne',
      render: (student) => (
        <Chip tone={gradeTone(student.average)}>{formatGrade(student.average)}</Chip>
      ),
    },
    {
      key: 'bar',
      header: 'Progression',
      width: 180,
      render: (student) => (
        <ProgressBar
          value={student.average ?? 0}
          max={20}
          tone={gradeTone(student.average)}
          label={`Moyenne de ${student.firstName} ${student.lastName}`}
        />
      ),
    },
    {
      key: 'subjects',
      header: 'Matières notées',
      align: 'numeric',
      render: (student) => formatCount(student.subjects.filter((s) => s.average !== null).length),
    },
  ];

  return (
    <div className="page-stack">
      <Tabs items={items} activeKey={tab} onChange={(key) => setTab(key as TabKey)} />

      <TabPanel tabKey="vue" activeKey={tab}>
        <div className="grid-stats">
          <StatTile label="Effectif" value={formatCount(stats.effectif)} />
          <StatTile
            label="Élèves évalués"
            value={formatCount(stats.evalues)}
            hint={`sur ${formatCount(stats.effectif)}`}
          />
          <StatTile label="Moyenne de classe" value={formatGrade(stats.average)} unit="/ 20" />
          <StatTile
            label="Meilleure / plus faible"
            value={`${formatGrade(stats.meilleure)} · ${formatGrade(stats.plusFaible)}`}
          />
        </div>
      </TabPanel>

      <TabPanel tabKey="eleves" activeKey={tab}>
        {/*
          Les notes par matière, à même la fiche.
          Le tableau ci-dessous classe les élèves mais ne dit pas *dans quelle
          matière* l'un décroche : il fallait ouvrir le bulletin en pleine page
          pour le savoir.
        */}
        <Card padded>
          <SectionTitle>Notes par matière</SectionTitle>
          <ClassBulletinPanel classId={data.classId} termId={termId} />
        </Card>

        <DataTable
          caption={`Élèves de ${data.className}, classés par moyenne`}
          columns={columns}
          rows={data.students}
          rowKey={(student) => String(student.studentId)}
          empty={
            <EmptyState
              icon="⚇"
              title="Aucun élève dans cette classe"
              description="Inscrivez des élèves depuis l'écran Élèves pour voir apparaître leurs résultats."
            />
          }
        />
      </TabPanel>

      <TabPanel tabKey="matieres" activeKey={tab}>
        <ClassSubjectsPanel classId={data.classId} />
      </TabPanel>

      {hasSchedule ? (
        <TabPanel tabKey="emploi" activeKey={tab}>
          <ClassSchedulePanel classId={data.classId} />
        </TabPanel>
      ) : null}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="page-stack">
      <div className="grid-stats">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} padded>
            <Skeleton width="60%" height={12} />
            <Skeleton width="45%" height={28} style={{ marginTop: 14 }} />
          </Card>
        ))}
      </div>
      <Card padded>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} height={38} style={{ marginBottom: 12 }} />
        ))}
      </Card>
    </div>
  );
}
