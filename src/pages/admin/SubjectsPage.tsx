import { useState, type FormEvent } from 'react';

import { errorMessage, subjectsApi, type Subject } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { formatCount, plural } from '../../lib/format';
import { personName } from '../../lib/text';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import { CoefficientsModal } from './CoefficientsModal';
import {
  Alert, Button, Card, Chip, ConfirmDialog, DataTable, EmptyState, Modal, ModalActions,
  Skeleton, TextField, useToast, type Column,
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

  function openCreate() {
    setCreationKey((key) => key + 1);
    setCreating(true);
  }

  const list = subjects.data ?? [];

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

  const columns: Column<Subject>[] = [
    {
      key: 'name',
      header: 'Matière',
      render: (subject) => <span style={{ fontWeight: 600 }}>{subject.name}</span>,
    },
    {
      key: 'coefficient',
      header: 'Coefficient',
      render: (subject) => <Chip tone="info">× {subject.coefficient}</Chip>,
    },
    {
      key: 'overrides',
      header: 'Coefficients par classe',
      render: (subject) =>
        subject.coefficientsParClasse.length === 0 ? (
          <span className="t-subtle">Coefficient de l'école</span>
        ) : (
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {subject.coefficientsParClasse.map((c) => (
              <Chip key={c.classId} tone="neutral">
                {c.className} × {c.coefficient}
              </Chip>
            ))}
          </div>
        ),
    },
    {
      key: 'teachers',
      header: 'Enseignants',
      render: (subject) =>
        subject.enseignants.length === 0 ? (
          <span className="t-subtle">—</span>
        ) : (
          // Un enseignant apparaît une fois par classe : on dédoublonne.
          [...new Map(subject.enseignants.map((t) => [t.id, t])).values()]
            .map((t) => personName(t))
            .join(', ')
        ),
    },
    {
      key: 'actions',
      srHeader: 'Actions',
      align: 'numeric',
      render: (subject) => (
        <div className="cell-actions">
          <Button size="sm" variant="secondary" onClick={() => setCoefficientsFor(subject)}>
            Coefficients
          </Button>
          <Button size="sm" variant="tonal" onClick={() => setEditing(subject)}>Modifier</Button>
          <Button size="sm" variant="danger" onClick={() => setToArchive(subject)}>Archiver</Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Matières & coefficients"
        subtitle={
          subjects.data
            ? `${formatCount(list.length)} ${plural(list.length, 'matière')} au programme`
            : 'Programme de l’établissement'
        }
        actions={<Button onClick={openCreate}>Créer une matière</Button>}
      />
      <PageContent>
        <QueryBoundary query={subjects} loading={<TableSkeleton />}>
          {(items) => (
            <DataTable
              caption="Matières et coefficients"
              columns={columns}
              rows={items}
              rowKey={(subject) => String(subject.id)}
              empty={
                <EmptyState
                  icon="≣"
                  title="Aucune matière"
                  description="Ajoutez les matières du programme pour permettre la saisie des notes."
                  action={{ label: 'Créer une matière', onClick: openCreate }}
                />
              }
            />
          )}
        </QueryBoundary>
      </PageContent>

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
    <Card padded>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} height={38} style={{ marginBottom: 12 }} />
      ))}
    </Card>
  );
}
