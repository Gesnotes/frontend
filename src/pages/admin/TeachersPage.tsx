import { useState, type FormEvent } from 'react';

import {
  classesApi, errorMessage, subjectsApi, teachersApi,
  type AssignmentInput, type ID, type Teacher,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { formatCount, plural } from '../../lib/format';
import { personName } from '../../lib/text';
import { emailError, phoneError } from '../../lib/validation';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import {
  Alert, Avatar, Button, Card, Chip, ConfirmDialog, DataTable, EmptyState, Modal, ModalActions,
  Skeleton, TextField, useToast, type Column,
} from '../../ui';

export default function TeachersPage() {
  const toast = useToast();
  const teachers = teachersApi.useTeachers();
  const remove = teachersApi.useDeleteTeacher();
  const resend = teachersApi.useResendInvitation();

  const [editing, setEditing] = useState<Teacher | null>(null);
  const [creating, setCreating] = useState(false);
  const [toArchive, setToArchive] = useState<Teacher | null>(null);

  const list = teachers.data ?? [];

  async function confirmArchive() {
    if (!toArchive) return;
    try {
      await remove.mutateAsync({ id: toArchive.id });
      toast.success('Compte désactivé');
      setToArchive(null);
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  async function sendInvitation(teacher: Teacher) {
    try {
      await resend.mutateAsync(teacher.id);
      toast.success(`Invitation renvoyée à ${teacher.email}`);
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  const columns: Column<Teacher>[] = [
    {
      key: 'identity',
      header: 'Enseignant',
      render: (teacher) => (
        <div className="cell-person">
          <Avatar name={personName(teacher, teacher.email)} size={36} brand />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>{personName(teacher, 'Invitation en attente')}</div>
            <div className="list-row__meta">{teacher.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'assignments',
      header: 'Affectations',
      render: (teacher) =>
        teacher.affectations.length === 0 ? (
          <span className="t-subtle">Aucune affectation</span>
        ) : (
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {teacher.affectations.map((a) => (
              <Chip key={a.id} tone="info">
                {a.subjectName} · {a.className}
              </Chip>
            ))}
          </div>
        ),
    },
    {
      key: 'actions',
      srHeader: 'Actions',
      align: 'numeric',
      render: (teacher) => (
        <div className="cell-actions">
          <Button size="sm" variant="secondary" onClick={() => void sendInvitation(teacher)}>
            Renvoyer l'invitation
          </Button>
          <Button size="sm" variant="tonal" onClick={() => setEditing(teacher)}>Modifier</Button>
          <Button size="sm" variant="danger" onClick={() => setToArchive(teacher)}>Désactiver</Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Comptes enseignants"
        subtitle={
          teachers.data
            ? `${formatCount(list.length)} ${plural(list.length, 'enseignant')} actif${list.length > 1 ? 's' : ''}`
            : 'Équipe pédagogique'
        }
        actions={<Button onClick={() => setCreating(true)}>Créer un compte</Button>}
      />
      <PageContent>
        <QueryBoundary query={teachers} loading={<TableSkeleton />}>
          {(items) => (
            <DataTable
              caption="Comptes enseignants et affectations"
              columns={columns}
              rows={items}
              rowKey={(teacher) => String(teacher.id)}
              empty={
                <EmptyState
                  icon="☰"
                  title="Aucun enseignant"
                  description="Créez un compte : l'enseignant recevra un lien pour définir son mot de passe."
                  action={{ label: 'Créer un compte', onClick: () => setCreating(true) }}
                />
              }
            />
          )}
        </QueryBoundary>
      </PageContent>

      <TeacherModal
        key={editing?.id ?? 'new'}
        open={creating || editing !== null}
        teacher={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={(created) => {
          setCreating(false);
          setEditing(null);
          toast.success(
            created
              ? "Compte créé — une invitation vient d'être envoyée"
              : 'Compte enseignant mis à jour',
          );
        }}
      />

      <ConfirmDialog
        open={toArchive !== null}
        title="Désactiver ce compte ?"
        description="L'enseignant ne pourra plus se connecter et ses sessions en cours sont coupées. Les notes qu'il a saisies sont conservées, et le compte peut être réactivé."
        confirmLabel="Désactiver"
        loading={remove.isPending}
        onCancel={() => setToArchive(null)}
        onConfirm={() => void confirmArchive()}
      />
    </>
  );
}

function TeacherModal({
  open, teacher, onClose, onSaved,
}: {
  open: boolean;
  teacher: Teacher | null;
  onClose: () => void;
  onSaved: (created: boolean) => void;
}) {
  const create = teachersApi.useCreateTeacher();
  const update = teachersApi.useUpdateTeacher();
  const classes = classesApi.useClasses();
  const subjects = subjectsApi.useSubjects();

  const [firstName, setFirstName] = useState(teacher?.firstName ?? '');
  const [lastName, setLastName] = useState(teacher?.lastName ?? '');
  const [email, setEmail] = useState(teacher?.email ?? '');
  const [phone, setPhone] = useState(teacher?.phone ?? '');
  const [assignments, setAssignments] = useState<AssignmentInput[]>(
    teacher?.affectations.map((a) => ({ classId: a.classId, subjectId: a.subjectId })) ?? [],
  );
  const [error, setError] = useState<string | null>(null);

  const pending = create.isPending || update.isPending;

  const [submitted, setSubmitted] = useState(false);

  // Le téléphone est un identifiant de connexion : mal saisi, il laisse
  // l'enseignant dehors sans que rien ne le signale à la création. L'email,
  // lui, porte l'invitation : faux, le compte reste sans mot de passe.
  const phoneMessage = phoneError(phone);
  const emailMessage = emailError(email);

  function toggle(classId: ID, subjectId: ID) {
    setAssignments((current) => {
      const exists = current.some((a) => a.classId === classId && a.subjectId === subjectId);
      return exists
        ? current.filter((a) => !(a.classId === classId && a.subjectId === subjectId))
        : [...current, { classId, subjectId }];
    });
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    setSubmitted(true);
    setError(null);
    if (phoneMessage || emailMessage) return;
    try {
      if (teacher) {
        await update.mutateAsync({
          id: teacher.id,
          email: email.trim(),
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          phone: phone.trim() || null,
          assignments,
        });
      } else {
        await create.mutateAsync({
          email: email.trim(),
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          phone: phone.trim() || undefined,
          assignments,
        });
      }
      onSaved(teacher === null);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={560}
      title={teacher ? 'Modifier le compte' : 'Créer un compte enseignant'}
      subtitle={
        teacher
          ? undefined
          : "Aucun mot de passe n'est saisi ici : l'enseignant reçoit un lien d'invitation."
      }
      footer={
        <ModalActions
          onCancel={onClose}
          onConfirm={() => void submit()}
          confirmLabel={teacher ? 'Enregistrer' : 'Créer le compte'}
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
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <TextField
            label="Nom"
            maxLength={100}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <TextField
          label="Email"
          type="email"
          required
          autoComplete="email"
          hint="C'est à cette adresse qu'est envoyée l'invitation."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={submitted ? emailMessage : undefined}
        />

        <TextField
          label="Téléphone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={30}
          placeholder="+229 01 97 00 00 00"
          hint="Facultatif. Sert aussi d'identifiant de connexion."
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={phoneMessage}
        />

        <AssignmentPicker
          classes={classes.data ?? []}
          subjects={subjects.data ?? []}
          selected={assignments}
          onToggle={toggle}
        />
      </form>
    </Modal>
  );
}

/**
 * Sélection des couples classe × matière.
 *
 * Ce sont eux, et non la matière seule, qui autorisent la saisie : le backend
 * refuse une note dès que le couple n'est pas affecté à l'enseignant.
 */
function AssignmentPicker({
  classes, subjects, selected, onToggle,
}: {
  classes: { id: ID; name: string }[];
  subjects: { id: ID; name: string }[];
  selected: AssignmentInput[];
  onToggle: (classId: ID, subjectId: ID) => void;
}) {
  const [subjectId, setSubjectId] = useState<ID | ''>('');

  if (classes.length === 0 || subjects.length === 0) {
    return (
      <Alert tone="info">
        Créez au moins une classe et une matière pour pouvoir affecter cet enseignant.
      </Alert>
    );
  }

  return (
    <div className="ui-field">
      <span className="ui-field__label">Affectations</span>

      <select
        className="ui-select"
        value={subjectId}
        onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : '')}
      >
        <option value="">— Choisir une matière —</option>
        {subjects.map((subject) => (
          <option key={subject.id} value={subject.id}>{subject.name}</option>
        ))}
      </select>

      {subjectId !== '' ? (
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
          {classes.map((klass) => {
            const checked = selected.some(
              (a) => a.classId === klass.id && a.subjectId === subjectId,
            );
            return (
              <label key={klass.id} className="ui-checkbox">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(klass.id, subjectId)}
                />
                {klass.name}
              </label>
            );
          })}
        </div>
      ) : null}

      <span className="ui-field__hint">
        {selected.length === 0
          ? 'Aucune affectation : cet enseignant ne pourra saisir aucune note.'
          : `${selected.length} ${plural(selected.length, 'affectation')} sélectionnée${selected.length > 1 ? 's' : ''}.`}
      </span>
    </div>
  );
}

function TableSkeleton() {
  return (
    <Card padded>
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} height={52} style={{ marginBottom: 12 }} />
      ))}
    </Card>
  );
}
