import {
  Archive, ClipboardCheck, Eye, GraduationCap, Pencil, School, Search,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  classesApi, teachersApi, errorMessage, schoolYearsApi,
  type ClassListItem, type ClassMode, type ID,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useTermContext } from '../../context/term-context';
import { formatCount, plural } from '../../lib/format';
import { TermSelect } from '../../layouts/TermSelect';
import { paths } from '../../routes/paths';
import {
  Alert, Avatar, Button, ConfirmDialog, Modal, ModalActions,
  SelectField, Skeleton, StatCardIcon, TextField, toneClasses, useToast,
} from '../../ui';

const MODE_OPTIONS: { value: ClassMode; icon: string; title: string; body: string }[] = [
  {
    value: 'notes',
    icon: '📘',
    title: 'Notes et bulletins',
    body: 'Devoirs et interros notés. Bulletin chaque trimestre.',
  },
  {
    value: 'presence',
    icon: '🧸',
    title: 'Présence',
    body: 'Pour maternelle et garderie : qui est là chaque jour.',
  },
];

/** Deux cartes larges plutôt qu'une case perdue dans un formulaire : un choix qui se voit. */
function ModePicker({ value, onChange }: { value: ClassMode; onChange: (mode: ClassMode) => void }) {
  return (
    <div className="ui-field">
      <span className="ui-field__label">Comment cette classe fonctionne-t-elle ?</span>
      <div className="mode-picker">
        {MODE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`mode-card${value === option.value ? ' mode-card--selected' : ''}`}
            onClick={() => onChange(option.value)}
          >
            <span className="mode-card__title">
              <span aria-hidden="true">{option.icon}</span> {option.title}
            </span>
            <span className="mode-card__body">{option.body}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ClassesPage() {
  const { termId } = useTermContext();
  const navigate = useNavigate();
  const toast = useToast();

  const classes = classesApi.useClasses(termId);
  const teachers = teachersApi.useTeachers();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ClassListItem | null>(null);
  const [toDelete, setToDelete] = useState<ClassListItem | null>(null);
  const deleteClass = classesApi.useDeleteClass();

  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');

  const list = classes.data ?? [];
  const headcount = list.reduce((sum, item) => sum + item.effectif, 0);
  const avgEffectif = list.length > 0 ? Math.round(headcount / list.length) : 0;

  const teacherName = useMemo(() => {
    const map = new Map<ID, string>();
    for (const teacher of teachers.data ?? []) {
      map.set(teacher.id, [teacher.firstName, teacher.lastName].filter(Boolean).join(' ') || teacher.email);
    }
    return map;
  }, [teachers.data]);

  const levels = useMemo(
    () => Array.from(new Set(list.map((item) => item.level))).sort((a, b) => a.localeCompare(b, 'fr')),
    [list],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return list.filter((item) => {
      if (levelFilter && item.level !== levelFilter) return false;
      if (query && !item.name.toLowerCase().includes(query) && !item.level.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [list, search, levelFilter]);

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      // Archivage, jamais suppression définitive : le backend refuse celle-ci
      // dès qu'un élève est rattaché, et la cascade emporterait leurs notes.
      await deleteClass.mutateAsync({ id: toDelete.id });
      toast.success(`${toDelete.name} archivée`);
      setToDelete(null);
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-8 py-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="mt-1 text-sm text-gray-500">
            {classes.data
              ? `${formatCount(list.length)} ${plural(list.length, 'classe')} · ${formatCount(headcount)} ${plural(headcount, 'élève')}`
              : "Classes de l'établissement"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TermSelect />
          <Button onClick={() => setCreating(true)}>Créer une classe</Button>
        </div>
      </div>

      <div className="space-y-6 p-8">
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <label className="relative flex-1 min-w-[220px]">
            <span className="sr-only">Rechercher une classe</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              placeholder="Rechercher une classe ou un niveau…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="">Tous les niveaux</option>
            {levels.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>

        <QueryBoundary query={classes} loading={<TableSkeleton />}>
          {() =>
            filtered.length === 0 ? (
              <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                <p className="font-semibold text-gray-900">
                  {list.length === 0 ? 'Aucune classe' : 'Aucune classe ne correspond à ce filtre'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {list.length === 0
                    ? 'Créez une première classe pour commencer à inscrire des élèves.'
                    : 'Essayez un autre nom ou un autre niveau.'}
                </p>
                {list.length === 0 ? (
                  <Button className="mt-4" onClick={() => setCreating(true)}>Créer une classe</Button>
                ) : null}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-6 py-3">Classe</th>
                      <th className="px-6 py-3">Professeur référent</th>
                      <th className="px-6 py-3">Effectif</th>
                      <th className="px-6 py-3 text-center">Mode</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((item) => (
                      <ClassRow
                        key={item.id}
                        item={item}
                        teacherName={item.homeroomTeacherId ? teacherName.get(item.homeroomTeacherId) : undefined}
                        onOpen={() => navigate(paths.admin.classDetail(item.id))}
                        onAttendance={() => navigate(paths.admin.classAttendance(item.id))}
                        onEdit={() => setEditing(item)}
                        onArchive={() => setToDelete(item)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </QueryBoundary>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <StatCardIcon icon={GraduationCap} tone="bg-blue-50 text-blue-600" label="Total élèves" value={formatCount(headcount)} />
          <StatCardIcon
            icon={School}
            tone="bg-violet-50 text-violet-600"
            label="Classes"
            value={formatCount(list.length)}
            hint={`${formatCount(list.filter((c) => c.mode === 'notes').length)} en notes · ${formatCount(list.filter((c) => c.mode === 'presence').length)} en présence`}
          />
          <StatCardIcon icon={GraduationCap} tone="bg-[#dde1ff] text-[#173bab]" label="Moyenne d'effectif" value={`${avgEffectif}`} hint="élèves / classe" />
        </div>
      </div>

      <CreateClassModal
        open={creating}
        classes={list}
        onClose={() => setCreating(false)}
        onCreated={(name) => {
          setCreating(false);
          toast.success(`Classe ${name} créée`);
        }}
      />

      <EditClassModal
        key={editing?.id ?? 'none'}
        item={editing}
        onClose={() => setEditing(null)}
        onSaved={(name) => {
          setEditing(null);
          toast.success(`${name} enregistrée`);
        }}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title={`Archiver ${toDelete?.name ?? ''} ?`}
        description="La classe n'apparaîtra plus dans les listes. Les élèves et leurs notes sont conservés, et la classe peut être restaurée."
        confirmLabel="Archiver"
        loading={deleteClass.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}

function ClassRow({
  item, teacherName, onOpen, onAttendance, onEdit, onArchive,
}: {
  item: ClassListItem;
  teacherName: string | undefined;
  onOpen: () => void;
  onAttendance: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const pct = item.evalues !== null && item.effectif > 0 ? Math.round((item.evalues / item.effectif) * 100) : null;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">{item.level}</span>
          <span className="font-semibold text-gray-900">{item.name}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        {teacherName ? (
          <div className="flex items-center gap-2">
            <Avatar name={teacherName} size={28} />
            <span className="text-gray-700">{teacherName}</span>
          </div>
        ) : (
          <span className="text-gray-400">Non assigné</span>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="text-gray-700">{formatCount(item.effectif)} {plural(item.effectif, 'élève')}</div>
        {item.mode === 'notes' && pct !== null ? (
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{pct}% noté</span>
          </div>
        ) : null}
      </td>
      <td className="px-6 py-4 text-center">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${toneClasses(item.mode === 'notes' ? 'info' : 'neutral')}`}>
          {item.mode === 'notes' ? 'Notes' : 'Présence'}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-1">
          <button type="button" onClick={onOpen} title="Voir le détail" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <Eye size={16} aria-hidden="true" />
          </button>
          {item.mode === 'presence' ? (
            <button type="button" onClick={onAttendance} title="Feuille de présence" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
              <ClipboardCheck size={16} aria-hidden="true" />
            </button>
          ) : null}
          <button type="button" onClick={onEdit} title="Modifier" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <Pencil size={16} aria-hidden="true" />
          </button>
          <button type="button" onClick={onArchive} title="Archiver" className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
            <Archive size={16} aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/**
 * Renommage d'une classe.
 *
 * Le niveau est modifiable mais ne rejoue pas les coefficients déjà posés :
 * il sert de gabarit à la création, pas de règle permanente.
 */
function EditClassModal({
  item, onClose, onSaved,
}: { item: ClassListItem | null; onClose: () => void; onSaved: (name: string) => void }) {
  const update = classesApi.useUpdateClass();
  const teachers = teachersApi.useTeachers();
  const years = schoolYearsApi.useSchoolYears();
  const [name, setName] = useState(item?.name ?? '');
  const [level, setLevel] = useState(item?.level ?? '');
  const [mode, setMode] = useState<ClassMode>(item?.mode ?? 'notes');
  const [homeroomTeacherId, setHomeroomTeacherId] = useState(
    item?.homeroomTeacherId ? String(item.homeroomTeacherId) : '',
  );
  const [schoolYearId, setSchoolYearId] = useState(item?.schoolYearId ? String(item.schoolYearId) : '');
  const [error, setError] = useState<string | null>(null);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!item) return;
    setError(null);
    try {
      await update.mutateAsync({
        id: item.id,
        name: name.trim(),
        level: level.trim(),
        mode,
        homeroomTeacherId: homeroomTeacherId ? (Number(homeroomTeacherId) as ID) : null,
        schoolYearId: schoolYearId ? Number(schoolYearId) : null,
      });
      onSaved(name.trim());
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <Modal
      open={item !== null}
      onClose={onClose}
      title="Modifier la classe"
      footer={
        <ModalActions
          onCancel={onClose}
          onConfirm={() => void submit()}
          confirmLabel="Enregistrer"
          loading={update.isPending}
        />
      }
    >
      <form onSubmit={submit} className="page-stack" style={{ gap: 'var(--space-4)' }}>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <TextField
          label="Nom de la classe"
          maxLength={50}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <TextField
          label="Niveau"
          maxLength={20}
          required
          hint="Changer le niveau ne modifie pas les coefficients déjà définis pour cette classe."
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        />

        <ModePicker value={mode} onChange={setMode} />

        <SelectField
          label="Enseignant référent"
          placeholder="— Aucun —"
          hint="Seul habilité, avec l'administration, à prendre la présence de cette classe."
          value={homeroomTeacherId}
          onChange={(e) => setHomeroomTeacherId(e.target.value)}
          options={(teachers.data ?? []).map((t) => ({
            value: String(t.id),
            label: [t.firstName, t.lastName].filter(Boolean).join(' ') || t.email,
          }))}
        />

        <SelectField
          label="Année scolaire"
          placeholder="— Aucune —"
          hint="Nécessaire pour préparer la rentrée suivante depuis les Années scolaires."
          value={schoolYearId}
          onChange={(e) => setSchoolYearId(e.target.value)}
          options={(years.data ?? []).map((y) => ({ value: String(y.id), label: y.label }))}
        />
      </form>
    </Modal>
  );
}

function CreateClassModal({
  open, classes, onClose, onCreated,
}: {
  open: boolean;
  classes: ClassListItem[];
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const create = classesApi.useCreateClass();
  const teachers = teachersApi.useTeachers();
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [mode, setMode] = useState<ClassMode>('notes');
  const [homeroomTeacherId, setHomeroomTeacherId] = useState('');
  const [copyFrom, setCopyFrom] = useState('');
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName('');
    setLevel('');
    setMode('notes');
    setHomeroomTeacherId('');
    setCopyFrom('');
    setError(null);
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({
        name: name.trim(),
        level: level.trim(),
        mode,
        homeroomTeacherId: homeroomTeacherId ? (Number(homeroomTeacherId) as ID) : undefined,
        copyCoefficientsFromClassId: copyFrom ? (Number(copyFrom) as ID) : undefined,
      });
      onCreated(name.trim());
      reset();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Créer une classe"
      subtitle="Le niveau sert de gabarit pour les coefficients."
      footer={
        <ModalActions
          onCancel={() => {
            reset();
            onClose();
          }}
          onConfirm={() => void submit()}
          confirmLabel="Créer la classe"
          loading={create.isPending}
        />
      }
    >
      <form onSubmit={submit} className="page-stack" style={{ gap: 'var(--space-4)' }}>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <TextField
          label="Nom de la classe"
          placeholder="Ex. 6e A"
          maxLength={50}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <TextField
          label="Niveau"
          placeholder="Ex. 6e"
          maxLength={20}
          required
          hint="Les classes d'un même niveau partagent généralement les mêmes coefficients."
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        />

        <ModePicker value={mode} onChange={setMode} />

        <SelectField
          label="Enseignant référent"
          placeholder="— Aucun —"
          hint="Seul habilité, avec l'administration, à prendre la présence de cette classe."
          value={homeroomTeacherId}
          onChange={(e) => setHomeroomTeacherId(e.target.value)}
          options={(teachers.data ?? []).map((t) => ({
            value: String(t.id),
            label: [t.firstName, t.lastName].filter(Boolean).join(' ') || t.email,
          }))}
        />

        {mode === 'notes' ? (
          <SelectField
            label="Reprendre les coefficients de"
            placeholder="— Ne rien reprendre —"
            hint="Évite de ressaisir tous les coefficients d'une classe du même niveau."
            value={copyFrom}
            onChange={(e) => setCopyFrom(e.target.value)}
            options={classes.map((c) => ({ value: String(c.id), label: `${c.name} (${c.level})` }))}
          />
        ) : null}
      </form>
    </Modal>
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
