import { useState, type FormEvent } from 'react';

import {
  classesApi, errorMessage, studentsApi,
  type AttachParentPayload, type ID, type Student,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { formatCount, plural } from '../../lib/format';
import { personName } from '../../lib/text';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import { DeleteStudentDialog } from './DeleteStudentDialog';
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
  const [editing, setEditing] = useState<Student | null>(null);
  const [linking, setLinking] = useState<Student | null>(null);
  const [toArchive, setToArchive] = useState<Student | null>(null);

  const total = students.data?.total ?? 0;
  const pageSize = students.data?.pageSize ?? 1;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const columns: Column<Student>[] = [
    {
      key: 'identity',
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
      header: '',
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
        actions={<Button onClick={() => setCreating(true)}>Ajouter un élève</Button>}
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
                      action={{ label: 'Ajouter un élève', onClick: () => setCreating(true) }}
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
        key={editing?.id ?? 'new'}
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
        student={linking}
        onClose={() => setLinking(null)}
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

  const pending = create.isPending || update.isPending;

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    setError(null);
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
          />
          <TextField
            label="Nom"
            maxLength={100}
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <SelectField
          label="Classe"
          placeholder="— Choisir une classe —"
          required
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
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

/** Association d'un parent : compte existant, ou création par invitation. */
function LinkParentModal({ student, onClose }: { student: Student | null; onClose: () => void }) {
  const toast = useToast();
  const attach = studentsApi.useAttachParent();
  const detach = studentsApi.useDetachParent();

  const [search, setSearch] = useState('');
  const results = studentsApi.useParentSearch(search);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function link(payload: AttachParentPayload) {
    if (!student) return;
    setError(null);
    try {
      await attach.mutateAsync({ id: student.id, payload });
      toast.success('Parent associé à l’élève');
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function unlink(parentId: ID) {
    if (!student) return;
    try {
      await detach.mutateAsync({ id: student.id, parentId });
      toast.success('Parent dissocié');
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <Modal
      open={student !== null}
      onClose={onClose}
      width={520}
      title="Parents de l'élève"
      subtitle={student ? `${student.firstName} ${student.lastName} · ${student.classe.name}` : undefined}
    >
      <div className="page-stack" style={{ gap: 'var(--space-5)' }}>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <section>
          <h3 className="t-label-sm t-muted">Parents associés</h3>
          {student && student.parents.length > 0 ? (
            <div className="list-rows">
              {student.parents.map((parent) => (
                <div key={parent.id} className="list-row">
                  <Avatar name={personName(parent)} size={32} />
                  <div className="list-row__body">
                    <div className="list-row__title">{personName(parent)}</div>
                    <div className="list-row__meta">{parent.email ?? parent.phone ?? '—'}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={detach.isPending}
                    onClick={() => void unlink(parent.id)}
                  >
                    Dissocier
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="t-body-md t-muted" style={{ marginTop: 'var(--space-2)' }}>
              Aucun parent associé : personne ne reçoit les notes de cet élève.
            </p>
          )}
        </section>

        <section>
          <h3 className="t-label-sm t-muted" style={{ marginBottom: 'var(--space-2)' }}>
            Associer un compte existant
          </h3>
          <TextField
            label="Rechercher un parent"
            placeholder="Nom, email ou téléphone"
            hint="Au moins deux caractères."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {results.data && results.data.length > 0 ? (
            <div className="list-rows" style={{ marginTop: 'var(--space-3)' }}>
              {results.data.map((parent) => (
                <div key={parent.id} className="list-row">
                  <Avatar name={personName(parent)} size={32} />
                  <div className="list-row__body">
                    <div className="list-row__title">{personName(parent)}</div>
                    <div className="list-row__meta">{parent.email ?? parent.phone ?? '—'}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="tonal"
                    loading={attach.isPending}
                    onClick={() => void link({ parentUserId: parent.id })}
                  >
                    Associer
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          {results.data && results.data.length === 0 && search.trim().length >= 2 ? (
            <p className="t-body-md t-muted" style={{ marginTop: 'var(--space-2)' }}>
              Aucun compte trouvé. Créez-en un ci-dessous.
            </p>
          ) : null}
        </section>

        <section>
          <h3 className="t-label-sm t-muted" style={{ marginBottom: 'var(--space-2)' }}>
            Ou inviter un nouveau parent
          </h3>
          <div className="page-stack" style={{ gap: 'var(--space-3)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <TextField
                label="Prénom"
                value={inviteFirstName}
                onChange={(e) => setInviteFirstName(e.target.value)}
              />
              <TextField
                label="Nom"
                value={inviteLastName}
                onChange={(e) => setInviteLastName(e.target.value)}
              />
            </div>
            <TextField
              label="Email"
              type="email"
              hint="Le parent recevra un lien pour définir son mot de passe."
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <Button
              variant="secondary"
              disabled={!inviteEmail.trim()}
              loading={attach.isPending}
              onClick={() =>
                void link({
                  email: inviteEmail.trim(),
                  firstName: inviteFirstName.trim() || undefined,
                  lastName: inviteLastName.trim() || undefined,
                })
              }
            >
              Créer et associer
            </Button>
          </div>
        </section>
      </div>
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
