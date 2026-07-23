import { useState, type FormEvent } from 'react';

import { errorMessage, isApiError, referentialsApi, type Term } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { formatDate } from '../../lib/format';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import {
  Alert, Button, Card, Chip, ConfirmDialog, DataTable, EmptyState, Modal, ModalActions,
  Skeleton, TextField, useToast, type Column,
} from '../../ui';

/**
 * Périodes scolaires.
 *
 * Rien ne se consulte sans elles : le détail d'une classe, un bulletin ou la
 * fiche d'un enfant exigent tous un `term_id`. Un établissement sans période
 * configurée est un établissement bloqué au premier écran.
 */
export default function PeriodsPage() {
  const toast = useToast();
  const terms = referentialsApi.useTerms();
  const remove = referentialsApi.useDeleteTerm();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Term | null>(null);
  const [toDelete, setToDelete] = useState<Term | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleteError(null);
    try {
      await remove.mutateAsync(toDelete.id);
      toast.success(`« ${toDelete.label} » supprimée`);
      setToDelete(null);
    } catch (cause) {
      // 409 : des notes sont rattachées. Le message du backend porte le
      // nombre exact, plus parlant qu'une formule générique.
      setDeleteError(errorMessage(cause));
      if (!isApiError(cause) || !cause.isConflict) toast.error(errorMessage(cause));
    }
  }

  const columns: Column<Term>[] = [
    {
      key: 'label',
      header: 'Période',
      render: (term) => (
        <div className="cell-person">
          <span style={{ fontWeight: 600 }}>{term.label}</span>
          {term.isCurrent ? <Chip tone="success">En cours</Chip> : null}
        </div>
      ),
    },
    {
      key: 'start',
      header: 'Début',
      render: (term) => <span className="t-muted">{formatDate(term.startDate)}</span>,
    },
    {
      key: 'end',
      header: 'Fin',
      render: (term) => <span className="t-muted">{formatDate(term.endDate)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'numeric',
      render: (term) => (
        <div className="cell-actions">
          <Button size="sm" variant="tonal" onClick={() => setEditing(term)}>Modifier</Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              setDeleteError(null);
              setToDelete(term);
            }}
          >
            Supprimer
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Périodes scolaires"
        subtitle="Trimestres de l'année en cours"
        actions={<Button onClick={() => setCreating(true)}>Créer une période</Button>}
      />
      <PageContent>
        <div className="page-stack">
          <Alert tone="info">
            Toutes les moyennes et tous les bulletins sont calculés par période. Sans période
            configurée, l'application ne peut afficher aucun résultat.
          </Alert>

          <QueryBoundary query={terms} loading={<TableSkeleton />}>
            {(items) => (
              <DataTable
                caption="Périodes scolaires"
                columns={columns}
                rows={items}
                rowKey={(term) => String(term.id)}
                empty={
                  <EmptyState
                    icon="◔"
                    title="Aucune période"
                    description="Créez les trimestres de l'année scolaire pour permettre le calcul des moyennes."
                    action={{ label: 'Créer une période', onClick: () => setCreating(true) }}
                  />
                }
              />
            )}
          </QueryBoundary>
        </div>
      </PageContent>

      <TermModal
        key={editing?.id ?? 'new'}
        open={creating || editing !== null}
        term={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={(label) => {
          setCreating(false);
          setEditing(null);
          toast.success(`« ${label} » enregistrée`);
        }}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title={`Supprimer « ${toDelete?.label ?? ''} » ?`}
        description={
          deleteError ??
          "La période disparaît définitivement. Il n'y a pas d'archivage : la suppression est refusée si des notes y sont rattachées, pour ne pas effacer le travail de saisie d'un trimestre entier."
        }
        confirmLabel="Supprimer"
        loading={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}

function TermModal({
  open, term, onClose, onSaved,
}: { open: boolean; term: Term | null; onClose: () => void; onSaved: (label: string) => void }) {
  const create = referentialsApi.useCreateTerm();
  const update = referentialsApi.useUpdateTerm();

  const [label, setLabel] = useState(term?.label ?? '');
  const [startDate, setStartDate] = useState(term?.startDate ?? '');
  const [endDate, setEndDate] = useState(term?.endDate ?? '');
  const [error, setError] = useState<string | null>(null);

  const pending = create.isPending || update.isPending;

  // Le backend refuse une période bornée d'un seul côté : autant le dire ici
  // plutôt que de laisser partir une requête vouée au 400.
  const halfBounded = Boolean(startDate) !== Boolean(endDate);
  const inverted = Boolean(startDate && endDate && startDate > endDate);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    setError(null);
    const payload = {
      label: label.trim(),
      startDate: startDate || null,
      endDate: endDate || null,
    };
    try {
      if (term) await update.mutateAsync({ id: term.id, ...payload });
      else await create.mutateAsync(payload);
      onSaved(payload.label);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={term ? 'Modifier la période' : 'Créer une période'}
      subtitle="Les dates servent à repérer la période en cours."
      footer={
        <ModalActions
          onCancel={onClose}
          onConfirm={() => void submit()}
          confirmLabel={term ? 'Enregistrer' : 'Créer la période'}
          loading={pending}
        />
      }
    >
      <form onSubmit={submit} className="page-stack" style={{ gap: 'var(--space-4)' }}>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <TextField
          label="Libellé"
          placeholder="Ex. Trimestre 1"
          maxLength={50}
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <TextField
            label="Début"
            type="date"
            value={startDate ?? ''}
            onChange={(e) => setStartDate(e.target.value)}
            error={halfBounded && !startDate ? 'Date manquante.' : undefined}
          />
          <TextField
            label="Fin"
            type="date"
            value={endDate ?? ''}
            onChange={(e) => setEndDate(e.target.value)}
            error={
              inverted
                ? 'La fin doit suivre le début.'
                : halfBounded && !endDate
                  ? 'Date manquante.'
                  : undefined
            }
          />
        </div>

        <span className="ui-field__hint">
          Renseignez les deux dates ou aucune. Sans elles, la période ne pourra jamais être
          détectée comme « en cours ». Deux périodes ne peuvent pas se chevaucher.
        </span>
      </form>
    </Modal>
  );
}

function TableSkeleton() {
  return (
    <Card padded>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} height={44} style={{ marginBottom: 12 }} />
      ))}
    </Card>
  );
}
