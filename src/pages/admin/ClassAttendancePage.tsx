import { Link, useParams } from 'react-router-dom';

import { classesApi } from '../../api';
import { AttendanceSheetPanel } from '../../components/AttendanceSheetPanel';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import { paths } from '../../routes/paths';
import { Button } from '../../ui';

export default function ClassAttendancePage() {
  const { classId } = useParams();
  const id = Number(classId);

  // Pas de période à demander ici : la présence n'a pas de « moyenne », un
  // jour se suffit à lui-même — contrairement au détail de classe.
  const classes = classesApi.useClasses();
  const klass = classes.data?.find((item) => item.id === id);

  return (
    <>
      <PageHeader
        title={klass?.name ?? 'Présence'}
        subtitle={klass ? `Niveau ${klass.level}` : 'Feuille de présence'}
        back={
          <Link to={paths.admin.classes}>
            <Button variant="ghost" aria-label="Retour aux classes">‹</Button>
          </Link>
        }
      />
      <PageContent>
        {Number.isFinite(id) ? <AttendanceSheetPanel classId={id} /> : null}
      </PageContent>
    </>
  );
}
