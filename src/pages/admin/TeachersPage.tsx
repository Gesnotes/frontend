import {
  Contact, Mail, Pencil, Search, UserRoundX, Users,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

import {
  classesApi, errorMessage, subjectsApi, teachersApi,
  type AssignmentInput, type ID, type Teacher,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { formatCount, plural } from '../../lib/format';
import { personName } from '../../lib/text';
import { emailError, phoneError } from '../../lib/validation';
import {
  Alert, Avatar, Button, Chip, ConfirmDialog, Modal, ModalActions,
  Skeleton, StatCardIcon, TextField, useToast,
} from '../../ui';

export default function TeachersPage() {
  const toast = useToast();
  const teachers = teachersApi.useTeachers();
  const remove = teachersApi.useDeleteTeacher();
  const resend = teachersApi.useResendInvitation();

  const [editing, setEditing] = useState<Teacher | null>(null);
  const [creating, setCreating] = useState(false);
  // Formulaire partagé création/modification : sans ce compteur, la clé du
  // modal ne changeait pas entre deux créations d'affilée et le compte
  // précédemment saisi restait affiché à la réouverture.
  const [creationKey, setCreationKey] = useState(0);
  const [toArchive, setToArchive] = useState<Teacher | null>(null);

  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  function openCreate() {
    setCreationKey((key) => key + 1);
    setCreating(true);
  }

  const list = teachers.data ?? [];
  const withoutAssignment = list.filter((t) => t.affectations.length === 0).length;
  const totalAssignments = list.reduce((sum, t) => sum + t.affectations.length, 0);

  const subjects = useMemo(
    () => Array.from(new Set(list.flatMap((t) => t.affectations.map((a) => a.subjectName)))).sort((a, b) => a.localeCompare(b, 'fr')),
    [list],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return list.filter((teacher) => {
      if (subjectFilter && !teacher.affectations.some((a) => a.subjectName === subjectFilter)) return false;
      if (query) {
        const haystack = `${personName(teacher, teacher.email)} ${teacher.email}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [list, search, subjectFilter]);

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

  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-8 py-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comptes enseignants</h1>
          <p className="mt-1 text-sm text-gray-500">
            {teachers.data
              ? `${formatCount(list.length)} ${plural(list.length, 'enseignant')} actif${list.length > 1 ? 's' : ''}`
              : 'Équipe pédagogique'}
          </p>
        </div>
        <Button onClick={openCreate}>Créer un compte</Button>
      </div>

      <div className="space-y-6 p-8">
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <label className="relative min-w-[260px] flex-1">
            <span className="sr-only">Rechercher un enseignant</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              placeholder="Rechercher un enseignant…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="">Toutes les matières</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>

        <QueryBoundary query={teachers} loading={<TableSkeleton />}>
          {() =>
            filtered.length === 0 ? (
              <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                <p className="font-semibold text-gray-900">
                  {list.length === 0 ? 'Aucun enseignant' : 'Aucun enseignant ne correspond à ce filtre'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {list.length === 0
                    ? "Créez un compte : l'enseignant recevra un lien pour définir son mot de passe."
                    : 'Essayez un autre nom ou une autre matière.'}
                </p>
                {list.length === 0 ? (
                  <Button className="mt-4" onClick={openCreate}>Créer un compte</Button>
                ) : null}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-6 py-3">Enseignant</th>
                      <th className="px-6 py-3">Affectations</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((teacher) => (
                      <tr key={teacher.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={personName(teacher, teacher.email)} size={36} brand />
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-gray-900">
                                {personName(teacher, 'Invitation en attente')}
                              </div>
                              <div className="truncate text-xs text-gray-500">{teacher.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {teacher.affectations.length === 0 ? (
                            <span className="text-gray-400">Aucune affectation</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {teacher.affectations.map((a) => (
                                <Chip key={a.id} tone="info">{a.subjectName} · {a.className}</Chip>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => void sendInvitation(teacher)}
                              title="Renvoyer l'invitation"
                              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            >
                              <Mail size={16} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditing(teacher)}
                              title="Modifier"
                              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            >
                              <Pencil size={16} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setToArchive(teacher)}
                              title="Désactiver"
                              className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <UserRoundX size={16} aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </QueryBoundary>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <StatCardIcon icon={Contact} tone="bg-[#dde1ff] text-[#173bab]" label="Total enseignants" value={formatCount(list.length)} />
          <StatCardIcon
            icon={Users}
            tone={withoutAssignment > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}
            label="Sans affectation"
            value={formatCount(withoutAssignment)}
          />
          <StatCardIcon icon={Users} tone="bg-violet-50 text-violet-600" label="Affectations totales" value={formatCount(totalAssignments)} />
        </div>
      </div>

      <TeacherModal
        key={editing ? editing.id : `new-${creationKey}`}
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
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} height={52} style={{ marginBottom: 12 }} />
      ))}
    </div>
  );
}
