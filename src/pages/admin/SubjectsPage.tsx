import {
  BookOpen, Calculator, Pencil, Search, Trash2, Users,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

import { errorMessage, subjectsApi, type Subject } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { formatCount, plural } from '../../lib/format';
import { personName } from '../../lib/text';
import { CoefficientsModal } from './CoefficientsModal';
import {
  Alert, Button, Chip, ConfirmDialog, Modal, ModalActions,
  Skeleton, StatCardIcon, TextField, useToast,
} from '../../ui';

export default function SubjectsPage() {
  const toast = useToast();
  const subjects = subjectsApi.useSubjects();
  const remove = subjectsApi.useDeleteSubject();

  const [editing, setEditing] = useState<Subject | null>(null);
  const [creating, setCreating] = useState(false);
  // Formulaire partagé création/modification : sans ce compteur, la clé du
  // modal ne changeait pas entre deux créations d'affilée et la matière
  // précédemment saisie restait affichée à la réouverture.
  const [creationKey, setCreationKey] = useState(0);
  const [toArchive, setToArchive] = useState<Subject | null>(null);
  const [coefficientsFor, setCoefficientsFor] = useState<Subject | null>(null);

  const [search, setSearch] = useState('');

  function openCreate() {
    setCreationKey((key) => key + 1);
    setCreating(true);
  }

  const list = subjects.data ?? [];
  const totalCoefficients = list.reduce((sum, s) => sum + Number(s.coefficient), 0);
  const teacherCount = new Set(list.flatMap((s) => s.enseignants.map((t) => t.id))).size;

  // Dépend de `subjects.data` (référence stable côté cache TanStack Query),
  // pas de `list` : `list` vaut `[]` par un `??` réévalué à chaque rendu tant
  // que la requête n'a pas de données, ce qui invaliderait ce memo à chaque
  // rendu pendant le chargement.
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const source = subjects.data ?? [];
    if (!query) return source;
    return source.filter((s) => s.name.toLowerCase().includes(query));
  }, [subjects.data, search]);

  async function confirmArchive() {
    if (!toArchive) return;
    try {
      await remove.mutateAsync({ id: toArchive.id });
      toast.success(`${toArchive.name} archivée`);
      setToArchive(null);
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-8 py-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Matières & coefficients</h1>
          <p className="mt-1 text-sm text-gray-500">
            {subjects.data
              ? `${formatCount(list.length)} ${plural(list.length, 'matière')} au programme`
              : "Programme de l'établissement"}
          </p>
        </div>
        <Button onClick={openCreate}>Créer une matière</Button>
      </div>

      <div className="space-y-6 p-8">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <label className="relative block max-w-md">
            <span className="sr-only">Rechercher une matière</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              placeholder="Rechercher une matière…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        <QueryBoundary query={subjects} loading={<TableSkeleton />}>
          {() =>
            filtered.length === 0 ? (
              <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                <p className="font-semibold text-gray-900">
                  {list.length === 0 ? 'Aucune matière' : 'Aucune matière ne correspond à cette recherche'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {list.length === 0
                    ? 'Ajoutez les matières du programme pour permettre la saisie des notes.'
                    : 'Essayez un autre nom.'}
                </p>
                {list.length === 0 ? (
                  <Button className="mt-4" onClick={openCreate}>Créer une matière</Button>
                ) : null}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-6 py-3">Matière</th>
                      <th className="px-6 py-3 text-center">Coefficient</th>
                      <th className="px-6 py-3">Coefficients par classe</th>
                      <th className="px-6 py-3">Enseignants</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((subject) => (
                      <tr key={subject.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-semibold text-gray-900">{subject.name}</td>
                        <td className="px-6 py-4 text-center">
                          <Chip tone="info">× {subject.coefficient}</Chip>
                        </td>
                        <td className="px-6 py-4">
                          {subject.coefficientsParClasse.length === 0 ? (
                            <span className="text-gray-400">Coefficient de l'école</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {subject.coefficientsParClasse.map((c) => (
                                <Chip key={c.classId} tone="neutral">{c.className} × {c.coefficient}</Chip>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {subject.enseignants.length === 0 ? (
                            <span className="text-gray-400">—</span>
                          ) : (
                            // Un enseignant apparaît une fois par classe : on dédoublonne.
                            [...new Map(subject.enseignants.map((t) => [t.id, t])).values()]
                              .map((t) => personName(t))
                              .join(', ')
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setCoefficientsFor(subject)}
                              title="Coefficients"
                              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            >
                              <Calculator size={16} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditing(subject)}
                              title="Modifier"
                              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            >
                              <Pencil size={16} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setToArchive(subject)}
                              title="Archiver"
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
            )
          }
        </QueryBoundary>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <StatCardIcon icon={BookOpen} tone="bg-blue-50 text-blue-600" label="Total matières" value={formatCount(list.length)} />
          <StatCardIcon icon={Calculator} tone="bg-amber-50 text-amber-600" label="Somme des coefficients" value={totalCoefficients.toFixed(1)} />
          <StatCardIcon icon={Users} tone="bg-emerald-50 text-emerald-600" label="Professeurs assignés" value={formatCount(teacherCount)} />
        </div>
      </div>

      <SubjectModal
        key={editing ? editing.id : `new-${creationKey}`}
        open={creating || editing !== null}
        subject={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={(name) => {
          setCreating(false);
          setEditing(null);
          toast.success(`${name} enregistrée`);
        }}
      />

      <CoefficientsModal
        key={coefficientsFor?.id ?? 'none'}
        subject={coefficientsFor}
        onClose={() => setCoefficientsFor(null)}
      />

      <ConfirmDialog
        open={toArchive !== null}
        title={`Archiver ${toArchive?.name ?? ''} ?`}
        description="La matière disparaît du programme. Les notes déjà saisies restent lisibles et continuent de compter dans les bulletins passés."
        confirmLabel="Archiver"
        loading={remove.isPending}
        onCancel={() => setToArchive(null)}
        onConfirm={() => void confirmArchive()}
      />
    </>
  );
}

function SubjectModal({
  open, subject, onClose, onSaved,
}: {
  open: boolean;
  subject: Subject | null;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const create = subjectsApi.useCreateSubject();
  const update = subjectsApi.useUpdateSubject();

  const [name, setName] = useState(subject?.name ?? '');
  const [coefficient, setCoefficient] = useState(String(subject?.coefficient ?? '1'));
  const [error, setError] = useState<string | null>(null);

  const pending = create.isPending || update.isPending;

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    setError(null);
    const payload = { name: name.trim(), coefficient: Number(coefficient) };
    try {
      if (subject) await update.mutateAsync({ id: subject.id, ...payload });
      else await create.mutateAsync(payload);
      onSaved(payload.name);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={subject ? 'Modifier la matière' : 'Créer une matière'}
      subtitle="Le coefficient s'applique par défaut à toutes les classes."
      footer={
        <ModalActions
          onCancel={onClose}
          onConfirm={() => void submit()}
          confirmLabel={subject ? 'Enregistrer' : 'Créer la matière'}
          loading={pending}
        />
      }
    >
      <form onSubmit={submit} className="page-stack" style={{ gap: 'var(--space-4)' }}>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <TextField
          label="Nom de la matière"
          placeholder="Ex. Mathématiques"
          maxLength={100}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <TextField
          label="Coefficient"
          type="number"
          min={0.01}
          max={99.99}
          step={0.5}
          required
          hint="Surchargeable classe par classe."
          value={coefficient}
          onChange={(e) => setCoefficient(e.target.value)}
        />
      </form>
    </Modal>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} height={38} style={{ marginBottom: 12 }} />
      ))}
    </div>
  );
}
