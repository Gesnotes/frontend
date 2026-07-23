import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { classesApi, errorMessage, type ClassListItem, type ID } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useTermContext } from '../../context/term-context';
import { formatCount, formatGrade, plural } from '../../lib/format';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import { TermSelect } from '../../layouts/TermSelect';
import { paths } from '../../routes/paths';
import {
  Alert, Button, Card, Chip, ConfirmDialog, EmptyState, Modal, ModalActions,
  ProgressBar, SelectField, Skeleton, TextField, gradeTone, useToast,
} from '../../ui';

export default function ClassesPage() {
  const { termId } = useTermContext();
  const navigate = useNavigate();
  const toast = useToast();

  const classes = classesApi.useClasses(termId);
  const [creating, setCreating] = useState(false);
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
                    hasTerm={termId !== undefined}
                    onOpen={() => navigate(paths.admin.classDetail(item.id))}
                    onArchive={() => setToDelete(item)}
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
  item, hasTerm, onOpen, onArchive,
}: { item: ClassListItem; hasTerm: boolean; onOpen: () => void; onArchive: () => void }) {
  return (
    <Card padded>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
        <div>
          <div className="t-title-md">{item.name}</div>
          <div className="t-label-sm t-subtle" style={{ textTransform: 'none' }}>
            Niveau {item.level}
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Chip tone={gradeTone(item.average)}>{formatGrade(item.average)}</Chip>
        </div>
      </div>

      <p className="t-body-md t-muted" style={{ margin: 'var(--space-4) 0 var(--space-2)' }}>
        {formatCount(item.effectif)} {plural(item.effectif, 'élève')}
      </p>

      <ProgressBar
        value={item.average ?? 0}
        max={20}
        tone={gradeTone(item.average)}
        label={`Moyenne de ${item.name}`}
      />

      {!hasTerm ? (
        <p className="t-label-sm t-subtle" style={{ marginTop: 'var(--space-2)', textTransform: 'none' }}>
          Sélectionnez une période pour afficher la moyenne.
        </p>
      ) : null}

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
        <Button size="sm" variant="tonal" onClick={onOpen}>Voir le détail</Button>
        <Button size="sm" variant="danger" onClick={onArchive}>Archiver</Button>
      </div>
    </Card>
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
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [copyFrom, setCopyFrom] = useState('');
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName('');
    setLevel('');
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

        <SelectField
          label="Reprendre les coefficients de"
          placeholder="— Ne rien reprendre —"
          hint="Évite de ressaisir tous les coefficients d'une classe du même niveau."
          value={copyFrom}
          onChange={(e) => setCopyFrom(e.target.value)}
          options={classes.map((c) => ({ value: String(c.id), label: `${c.name} (${c.level})` }))}
        />
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
