import { FolderInput, Pencil, Search, Trash2, UserRoundPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  classesApi, errorMessage, studentsApi,
  type ID, type Sex, type Student,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { downloadBlob } from '../../lib/download';
import { formatCount, plural } from '../../lib/format';
import { personName } from '../../lib/text';
import { paths } from '../../routes/paths';
import { DeleteStudentDialog } from './DeleteStudentDialog';
import { ImportStudentsModal } from './ImportStudentsModal';
import { LinkParentModal } from './LinkParentModal';
import {
  Alert, Avatar, Button, Modal, ModalActions,
  SelectField, Skeleton, TextField, toneClasses, useToast,
} from '../../ui';

export default function StudentsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const classes = classesApi.useClasses();

  const [classFilter, setClassFilter] = useState<ID | ''>('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const students = studentsApi.useStudents({
    classId: classFilter === '' ? undefined : classFilter,
    page,
    search: debouncedSearch || undefined,
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

  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-8 py-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Élèves</h1>
          <p className="mt-1 text-sm text-gray-500">
            {students.data ? `${formatCount(total)} ${plural(total, 'élève')} inscrit${total > 1 ? 's' : ''}` : 'Effectifs'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="tonal" loading={exporting} onClick={() => void exportCsv()}>
            Exporter en CSV
          </Button>
          <Button variant="secondary" onClick={() => setImporting(true)}>
            <FolderInput size={16} aria-hidden="true" /> Importer une liste
          </Button>
          <Button data-tour="admin-add-eleve" onClick={openCreate}>Ajouter un élève</Button>
        </div>
      </div>

      <div className="space-y-6 p-8">
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Rechercher un élève</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              placeholder="Rechercher un élève par nom ou prénom…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <select
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
        </div>

        <QueryBoundary query={students} loading={<TableSkeleton />}>
          {(data) =>
            data.students.length === 0 ? (
              <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                <p className="font-semibold text-gray-900">
                  {debouncedSearch
                    ? `Aucun résultat pour « ${debouncedSearch} »`
                    : classFilter === '' ? 'Aucun élève' : 'Aucun élève dans cette classe'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {debouncedSearch
                    ? 'Vérifiez l’orthographe, ou affinez avec le nom de famille seul.'
                    : 'Ajoutez un élève et associez-lui un parent pour qu’il reçoive les notes.'}
                </p>
                {debouncedSearch ? null : <Button className="mt-4" onClick={openCreate}>Ajouter un élève</Button>}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-6 py-3">Élève</th>
                        <th className="px-6 py-3">Classe</th>
                        <th className="px-6 py-3">Parents associés</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.students.map((student) => (
                        <tr
                          key={student.id}
                          onClick={() => navigate(paths.admin.studentDetail(student.id))}
                          className="cursor-pointer hover:bg-gray-50"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={`${student.firstName} ${student.lastName}`} size={32} />
                              <span className="font-semibold text-gray-900">
                                {student.firstName} {student.lastName}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${toneClasses('neutral')}`}>
                              {student.classe.name}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {student.parents.length === 0 ? (
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${toneClasses('danger')}`}>
                                Aucun parent
                              </span>
                            ) : (
                              <span className="text-gray-700">
                                {student.parents.map((parent) => personName(parent)).join(', ')}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setLinking(student)}
                                title={student.parents.length === 0 ? 'Associer un parent' : 'Gérer les parents'}
                                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                              >
                                <UserRoundPlus size={16} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditing(student)}
                                title="Modifier"
                                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                              >
                                <Pencil size={16} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setToArchive(student)}
                                title="Supprimer"
                                className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 size={16} aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {pageCount > 1 ? (
                  <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
                    <span className="text-sm text-gray-500">Page {data.page} sur {pageCount}</span>
                    <div className="flex gap-2">
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
            )
          }
        </QueryBoundary>
      </div>

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
  const [sex, setSex] = useState<Sex | ''>(student?.sex ?? '');
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
        await update.mutateAsync({
          id: student.id,
          ...base,
          birthDate: birthDate || null,
          sex: sex || null,
        });
      } else {
        await create.mutateAsync({ ...base, birthDate: birthDate || undefined, sex: sex || undefined });
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

        <SelectFieldClasses
          value={classId}
          onChange={setClassId}
          classes={classes}
          error={submitted ? fieldErrors.classId : undefined}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <TextField
            label="Date de naissance"
            type="date"
            value={birthDate ?? ''}
            onChange={(e) => setBirthDate(e.target.value)}
          />
          <SelectField
            label="Sexe"
            placeholder="Non renseigné"
            options={[
              { value: 'M', label: 'Masculin' },
              { value: 'F', label: 'Féminin' },
            ]}
            value={sex ?? ''}
            onChange={(e) => setSex(e.target.value as 'M' | 'F' | '')}
          />
        </div>

        {student ? null : (
          <Alert tone="info">
            L'association d'un parent se fait après la création, depuis la liste des élèves.
          </Alert>
        )}
      </form>
    </Modal>
  );
}

/** Évite d'importer `SelectField` juste pour ce seul usage restant sur cette page. */
function SelectFieldClasses({
  value, onChange, classes, error,
}: { value: string; onChange: (v: string) => void; classes: { id: ID; name: string }[]; error?: string }) {
  return (
    <label className="ui-field">
      <span className="ui-field__label">Classe</span>
      <select
        className="ui-select"
        aria-invalid={error ? 'true' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— Choisir une classe —</option>
        {classes.map((c) => (
          <option key={c.id} value={String(c.id)}>{c.name}</option>
        ))}
      </select>
      {error ? <span className="ui-field__error">{error}</span> : null}
    </label>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} height={44} style={{ marginBottom: 12 }} />
      ))}
    </div>
  );
}
