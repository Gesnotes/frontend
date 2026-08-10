import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  classesApi, teachersApi, errorMessage, schoolYearsApi,
  type ClassListItem, type ClassMode, type ID,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useTermContext } from '../../context/term-context';
import { formatCount, plural } from '../../lib/format';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import { TermSelect } from '../../layouts/TermSelect';
import { paths } from '../../routes/paths';
import {
  Alert, Button, Card, ConfirmDialog, EmptyState, Modal, ModalActions,
  ProgressBar, SelectField, Skeleton, TextField, useToast,
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
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ClassListItem | null>(null);
  const [toDelete, setToDelete] = useState<ClassListItem | null>(null);
  const deleteClass = classesApi.useDeleteClass();

  const list = classes.data ?? [];
  const headcount = list.reduce((sum, item) => sum + item.effectif, 0);

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
      <PageHeader
        title="Classes"
        subtitle={
          classes.data
            ? `${formatCount(list.length)} ${plural(list.length, 'classe')} · ${formatCount(headcount)} ${plural(headcount, 'élève')}`
            : "Classes de l'établissement"
        }
        actions={
          <>
            <TermSelect />
            <Button onClick={() => setCreating(true)}>Créer une classe</Button>
          </>
        }
      />
      <PageContent>
        <QueryBoundary query={classes} loading={<CardsSkeleton />}>
          {(items) =>
            items.length === 0 ? (
              <EmptyState
                icon="◫"
                title="Aucune classe"
                description="Créez une première classe pour commencer à inscrire des élèves."
                action={{ label: 'Créer une classe', onClick: () => setCreating(true) }}
              />
            ) : (
              <div className="grid-cards">
                {items.map((item) => (
                  <ClassCard
                    key={item.id}
                    item={item}
                    termId={termId}
                    onOpen={() => navigate(paths.admin.classDetail(item.id))}
                    onBulletin={() => navigate(paths.admin.classBulletin(item.id))}
                    onEdit={() => setEditing(item)}
                    onArchive={() => setToDelete(item)}
                    onAttendance={() => navigate(paths.admin.classAttendance(item.id))}
                  />
                ))}
              </div>
            )
          }
        </QueryBoundary>
      </PageContent>

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

function ClassCard({
  item, termId, onOpen, onBulletin, onEdit, onArchive, onAttendance,
}: {
  item: ClassListItem;
  termId: ID | undefined;
  onOpen: () => void;
  onBulletin: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onAttendance: () => void;
}) {
  const hasTerm = termId !== undefined;
  const isPresence = item.mode === 'presence';
  const pct =
    hasTerm && item.evalues !== null && item.effectif > 0
      ? Math.round((item.evalues / item.effectif) * 100)
      : null;

  return (
    <Card padded>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
        <span className="class-card__badge" aria-hidden="true">{item.level}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="t-title-md">{item.name}</div>
          <div className="t-label-sm t-subtle" style={{ textTransform: 'none' }}>
            {formatCount(item.effectif)} {plural(item.effectif, 'élève')}
          </div>
        </div>
        <ClassCardMenu onEdit={onEdit} onArchive={onArchive} className={item.name} />
      </div>

      {isPresence ? null : (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <p className="t-label-sm t-subtle" style={{ marginBottom: 'var(--space-1)', textTransform: 'none' }}>
            {pct !== null
              ? `${pct}% des notes saisies ce trimestre`
              : hasTerm
                ? 'Aucun élève dans cette classe.'
                : 'Sélectionnez une période pour suivre la saisie.'}
          </p>
          <ProgressBar value={pct ?? 0} max={100} tone="info" label={`Notes saisies pour ${item.name}`} />
        </div>
      )}

      <div className="card-actions card-actions--stacked">
        {isPresence ? (
          <Button block variant="tonal" icon="◔" onClick={onAttendance}>Feuille de présence</Button>
        ) : (
          <>
            <Button block variant="tonal" icon="▤" onClick={onBulletin}>Voir les notes</Button>
            <Button block variant="secondary" icon="◔" onClick={onAttendance}>Présence</Button>
          </>
        )}
        <Button block variant="secondary" icon="⋯" onClick={onOpen}>Détail</Button>
      </div>
    </Card>
  );
}

/**
 * Menu « … » : gestes rares (renommer, archiver), délibérément repliés plutôt
 * qu'en rangée permanente — la carte sert d'abord à consulter une classe, pas
 * à la réorganiser.
 */
function ClassCardMenu({
  onEdit, onArchive, className,
}: { onEdit: () => void; onArchive: () => void; className: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Capturé au moment même de la fermeture, pas dans le nettoyage de l'effet
  // ci-dessous : le panneau est déjà retiré du DOM à ce moment-là (le focus
  // serait donc toujours retombé sur `<body>`, jamais détecté « dans le
  // menu »), et on ne veut voler le focus au bouton déclencheur que si
  // l'utilisateur interagissait réellement au clavier avec le menu.
  const focusWasInsideRef = useRef(false);

  function close() {
    focusWasInsideRef.current = !!ref.current?.contains(document.activeElement);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      if (focusWasInsideRef.current) trigger?.focus();
    };
  }, [open]);

  return (
    <div className="class-card__menu" ref={ref}>
      <button
        type="button"
        ref={triggerRef}
        className="class-card__menu-trigger"
        aria-label={`Actions pour ${className}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ⋮
      </button>
      {open ? (
        <div className="class-card__menu-panel" role="menu">
          <button
            type="button"
            role="menuitem"
            className="class-card__menu-item"
            onClick={() => {
              close();
              onEdit();
            }}
          >
            Renommer
          </button>
          <button
            type="button"
            role="menuitem"
            className="class-card__menu-item class-card__menu-item--danger"
            onClick={() => {
              close();
              onArchive();
            }}
          >
            Archiver
          </button>
        </div>
      ) : null}
    </div>
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

function CardsSkeleton() {
  return (
    <div className="grid-cards">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Card key={i} padded>
          <Skeleton width="50%" height={22} />
          <Skeleton width="35%" height={12} style={{ marginTop: 10 }} />
          <Skeleton height={7} style={{ marginTop: 22 }} />
        </Card>
      ))}
    </div>
  );
}
