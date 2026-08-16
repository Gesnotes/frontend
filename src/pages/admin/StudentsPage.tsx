import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import {
  classesApi, errorMessage, studentsApi,
  type ID, type Student,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { downloadBlob } from '../../lib/download';
import { formatCount, plural } from '../../lib/format';
import { personName } from '../../lib/text';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import { paths } from '../../routes/paths';
import { DeleteStudentDialog } from './DeleteStudentDialog';
import { ImportStudentsModal } from './ImportStudentsModal';
import { LinkParentModal } from './LinkParentModal';
import {
  Alert, Avatar, Button, Card, Chip, DataTable, EmptyState, Modal, ModalActions,
  SelectField, Skeleton, TextField, useToast, type Column,
} from '../../ui';

export default function StudentsPage() {
  const toast = useToast();
  const classes = classesApi.useClasses();

  const [classFilter, setClassFilter] = useState<ID | ''>('');
  const [page, setPage] = useState(1);
  const students = studentsApi.useStudents({
    classId: classFilter === '' ? undefined : classFilter,
    page,
  });

  const [creating, setCreating] = useState(false);
  // Le formulaire est partagé entre création et modification : sans ce
  // compteur, sa clé ne changeait qu'en passant d'un élève à un autre, jamais
  // entre deux créations d'affilée — le précédent élève saisi restait affiché.
  const [creationKey, setCreationKey] = useState(0);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);

  function openCreate() {
    setCreationKey((key) => key + 1);
    setCreating(true);
  }

  /**
   * L'export porte le filtre de classe affiché, mais jamais la pagination :
   * un secrétariat qui demande « la liste » veut l'établissement entier, pas
   * les cent premiers.
   */
  async function exportCsv() {
    setExporting(true);
    try {
      const blob = await studentsApi.exportStudentsCsv({
        classId: classFilter === '' ? undefined : classFilter,
      });
      const scope = classFilter === '' ? 'etablissement' : 'classe';
      downloadBlob(blob, `eleves-${scope}.csv`);
      toast.success('Liste exportée');
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setExporting(false);
    }
  }
  const [linking, setLinking] = useState<Student | null>(null);
  const [toArchive, setToArchive] = useState<Student | null>(null);

  /**
   * L'élève ouvert dans la fiche « parents » est relu dans les données fraîches.
   *
   * Associer un parent invalide la liste, mais l'objet mis en état ici reste
   * celui d'avant la mutation : la fiche continuait d'afficher « Aucun parent
   * associé » alors que le compte venait d'être créé côté serveur, et
   * l'administration croyait l'opération échouée. Repli sur l'instantané tant
   * que la requête n'a pas répondu, pour que la fiche ne se referme pas.
   */
  const linkingLive = linking
    ? (students.data?.students.find((item) => item.id === linking.id) ?? linking)
    : null;

  const total = students.data?.total ?? 0;
  const pageSize = students.data?.pageSize ?? 1;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const columns: Column<Student>[] = [
    {
      key: 'identity',
      header: 'Élève',
      render: (student) => (
        <Link to={paths.admin.studentDetail(student.id)} className="cell-person">
          <Avatar name={`${student.firstName} ${student.lastName}`} size={32} />
          <span style={{ fontWeight: 600 }}>
            {student.firstName} {student.lastName}
          </span>
        </Link>
      ),
    },
    {
      key: 'class',
      header: 'Classe',
      render: (student) => <Chip tone="neutral">{student.classe.name}</Chip>,
    },
    {
      key: 'parents',
      header: 'Parents associés',
      render: (student) =>
        student.parents.length === 0 ? (
          // Un élève sans parent associé est un parent qui ne recevra jamais
          // les notes : c'est l'anomalie que cet écran doit rendre visible.
          <Chip tone="danger">Aucun parent</Chip>
        ) : (
          student.parents.map((parent) => personName(parent)).join(', ')
        ),
    },
    {
      key: 'actions',
      srHeader: 'Actions',
      align: 'numeric',
      render: (student) => (
        <div className="cell-actions">
          <Button size="sm" variant="secondary" onClick={() => setLinking(student)}>
            {student.parents.length === 0 ? 'Associer un parent' : 'Gérer les parents'}
          </Button>
          <Button size="sm" variant="tonal" onClick={() => setEditing(student)}>Modifier</Button>
          <Button size="sm" variant="danger" onClick={() => setToArchive(student)}>Supprimer</Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Élèves"
        subtitle={
          students.data ? `${formatCount(total)} ${plural(total, 'élève')} inscrit${total > 1 ? 's' : ''}` : 'Effectifs'
        }
        actions={
          <>
            <Button variant="tonal" loading={exporting} onClick={() => void exportCsv()}>
              Exporter en CSV
            </Button>
            <Button variant="secondary" onClick={() => setImporting(true)}>
              Importer une liste
            </Button>
            <Button onClick={openCreate}>Ajouter un élève</Button>
          </>
        }
      />
      <PageContent>
        <div className="page-stack">
          <div className="page-toolbar">
            <label className="ui-field" style={{ minWidth: 220 }}>
              <span className="sr-only">Filtrer par classe</span>
              <select
                className="ui-select"
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value ? Number(e.target.value) : '');
                  setPage(1);
                }}
              >
                <option value="">Toutes les classes</option>
                {(classes.data ?? []).map((klass) => (
                  <option key={klass.id} value={klass.id}>{klass.name}</option>
                ))}
              </select>
            </label>
          </div>

          <QueryBoundary query={students} loading={<TableSkeleton />}>
            {(data) => (
              <>
                <DataTable
                  caption="Élèves inscrits"
                  columns={columns}
                  rows={data.students}
                  rowKey={(student) => String(student.id)}
                  empty={
                    <EmptyState
                      icon="⚇"
                      title={classFilter === '' ? 'Aucun élève' : 'Aucun élève dans cette classe'}
                      description="Ajoutez un élève et associez-lui un parent pour qu'il reçoive les notes."
                      action={{ label: 'Ajouter un élève', onClick: openCreate }}
                    />
                  }
                />

                {pageCount > 1 ? (
                  <div className="page-toolbar">
                    <span className="t-body-md t-muted">
                      Page {data.page} sur {pageCount}
                    </span>
                    <div className="page-toolbar__end">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={data.page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Précédente
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={data.page >= pageCount}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Suivante
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </QueryBoundary>
        </div>
      </PageContent>

      <StudentModal
        key={editing ? editing.id : `new-${creationKey}`}
        open={creating || editing !== null}
        student={editing}
        classes={classes.data ?? []}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={() => {
          setCreating(false);
          setEditing(null);
          toast.success('Élève enregistré');
        }}
      />

      <LinkParentModal
        key={`link-${linking?.id ?? 'none'}`}
        student={linkingLive}
        onClose={() => setLinking(null)}
      />

      <ImportStudentsModal
        open={importing}
        onClose={() => setImporting(false)}
        onImported={(created) => {
          setImporting(false);
          setPage(1);
          toast.success(`${formatCount(created)} ${plural(created, 'élève')} inscrit${created > 1 ? 's' : ''}`);
        }}
      />

      <DeleteStudentDialog
        key={toArchive?.id ?? 'none'}
        student={toArchive}
        onClose={() => setToArchive(null)}
      />
    </>
  );
}

function StudentModal({
  open, student, classes, onClose, onSaved,
}: {
  open: boolean;
  student: Student | null;
  classes: { id: ID; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const create = studentsApi.useCreateStudent();
  const update = studentsApi.useUpdateStudent();

  const [firstName, setFirstName] = useState(student?.firstName ?? '');
  const [lastName, setLastName] = useState(student?.lastName ?? '');
  const [classId, setClassId] = useState(String(student?.classId ?? ''));
  const [birthDate, setBirthDate] = useState(student?.birthDate ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const pending = create.isPending || update.isPending;

  /**
   * Validation locale des champs obligatoires.
   *
   * Le bouton du pied de modale n'est pas un `submit` : la validation native du
   * navigateur ne se déclenchait jamais et un formulaire vide partait au
   * serveur, qui répondait un 400 sans rien dire de *quel* champ manquait. Les
   * messages n'apparaissent qu'après une première tentative, pour ne pas
   * accueillir l'utilisateur avec un formulaire déjà en rouge.
   */
  const fieldErrors = {
    firstName: firstName.trim() ? undefined : 'Le prénom est requis.',
    lastName: lastName.trim() ? undefined : 'Le nom est requis.',
    classId: classId ? undefined : 'Choisissez une classe.',
  };
  const hasErrors = Object.values(fieldErrors).some(Boolean);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    setSubmitted(true);
    setError(null);
    if (hasErrors) return;
    try {
      const base = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        classId: Number(classId) as ID,
      };
      if (student) {
        await update.mutateAsync({ id: student.id, ...base, birthDate: birthDate || null });
      } else {
        await create.mutateAsync({ ...base, birthDate: birthDate || undefined });
      }
      onSaved();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={student ? "Modifier l'élève" : 'Ajouter un élève'}
      footer={
        <ModalActions
          onCancel={onClose}
          onConfirm={() => void submit()}
          confirmLabel={student ? 'Enregistrer' : "Ajouter l'élève"}
          loading={pending}
        />
      }
    >
      <form onSubmit={submit} className="page-stack" style={{ gap: 'var(--space-4)' }}>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <TextField
            label="Prénom"
            maxLength={100}
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            error={submitted ? fieldErrors.firstName : undefined}
          />
          <TextField
            label="Nom"
            maxLength={100}
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            error={submitted ? fieldErrors.lastName : undefined}
          />
        </div>

        <SelectField
          label="Classe"
          placeholder="— Choisir une classe —"
          required
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
          error={submitted ? fieldErrors.classId : undefined}
        />

        <TextField
          label="Date de naissance"
          type="date"
          value={birthDate ?? ''}
          onChange={(e) => setBirthDate(e.target.value)}
        />

        {student ? null : (
          <Alert tone="info">
            L'association d'un parent se fait après la création, depuis la liste des élèves.
          </Alert>
        )}
      </form>
    </Modal>
  );
}

function TableSkeleton() {
  return (
    <Card padded>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} height={44} style={{ marginBottom: 12 }} />
      ))}
    </Card>
  );
}
