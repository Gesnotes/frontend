import { useState, type FormEvent } from 'react';

import { errorMessage, holidaysApi, isApiError, type Holiday } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { formatDate } from '../../lib/format';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import {
  Alert, Button, Card, ConfirmDialog, DataTable, EmptyState, Modal, ModalActions,
  Skeleton, TextField, useToast, type Column,
} from '../../ui';

/**
 * Calendrier scolaire : jours fériés et de congé.
 *
 * Sert uniquement à exclure « aucun appel » du tableau de bord un jour où
 * aucun appel n'est attendu — voir `AdminDashboard.ferie`.
 */
export default function HolidaysPage() {
  const toast = useToast();
  const holidays = holidaysApi.useHolidays();
  const archive = holidaysApi.useArchiveHoliday();

  const [creating, setCreating] = useState(false);
  const [creationKey, setCreationKey] = useState(0);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [toArchive, setToArchive] = useState<Holiday | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  function openCreate() {
    setCreationKey((key) => key + 1);
    setCreating(true);
  }

  async function confirmArchive() {
    if (!toArchive) return;
    setArchiveError(null);
    try {
      await archive.mutateAsync(toArchive.id);
      toast.success(`« ${toArchive.label} » archivé`);
      setToArchive(null);
    } catch (cause) {
      setArchiveError(errorMessage(cause));
      if (!isApiError(cause) || !cause.isConflict) toast.error(errorMessage(cause));
    }
  }

  const columns: Column<Holiday>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (holiday) => <span style={{ fontWeight: 600 }}>{formatDate(holiday.date)}</span>,
    },
    { key: 'label', header: 'Libellé', render: (holiday) => holiday.label },
    {
      key: 'actions',
      srHeader: 'Actions',
      align: 'numeric',
      render: (holiday) => (
        <div className="cell-actions">
          <Button size="sm" variant="tonal" onClick={() => setEditing(holiday)}>Modifier</Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              setArchiveError(null);
              setToArchive(holiday);
            }}
          >
            Archiver
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Calendrier scolaire"
        subtitle="Jours fériés et de congé"
        actions={<Button onClick={openCreate}>Ajouter un jour férié</Button>}
      />
      <PageContent>
        <div className="page-stack">
          <Alert tone="info">
            Un jour férié n'est pas compté comme un oubli d'appel dans les alertes du tableau de
            bord.
          </Alert>

          <QueryBoundary query={holidays} loading={<TableSkeleton />}>
            {(items) => (
              <DataTable
                caption="Jours fériés"
                columns={columns}
                rows={items}
                rowKey={(holiday) => String(holiday.id)}
                empty={
                  <EmptyState
                    icon="◔"
                    title="Aucun jour férié"
                    description="Ajoutez les jours fériés et de congé de l'école pour qu'ils soient exclus des alertes d'appel."
                    action={{ label: 'Ajouter un jour férié', onClick: openCreate }}
                  />
                }
              />
            )}
          </QueryBoundary>
        </div>
      </PageContent>

      <HolidayModal
        key={editing ? editing.id : `new-${creationKey}`}
        open={creating || editing !== null}
        holiday={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={(label) => {
          setCreating(false);
          setEditing(null);
          toast.success(`« ${label} » enregistré`);
        }}
      />

      <ConfirmDialog
        open={toArchive !== null}
        title={`Archiver « ${toArchive?.label ?? ''} » ?`}
        description={
          archiveError ??
          "Ce jour sort de la liste, mais rien n'est perdu : vous pouvez le restaurer — ou le supprimer définitivement — depuis les Archives."
        }
        confirmLabel="Archiver"
        loading={archive.isPending}
        onCancel={() => setToArchive(null)}
        onConfirm={() => void confirmArchive()}
      />
    </>
  );
}

function HolidayModal({
  open, holiday, onClose, onSaved,
}: { open: boolean; holiday: Holiday | null; onClose: () => void; onSaved: (label: string) => void }) {
  const create = holidaysApi.useCreateHoliday();
  const update = holidaysApi.useUpdateHoliday();

  const [date, setDate] = useState(holiday?.date ?? '');
  const [label, setLabel] = useState(holiday?.label ?? '');
  const [error, setError] = useState<string | null>(null);

  const pending = create.isPending || update.isPending;

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    setError(null);
    const payload = { date, label: label.trim() };
    try {
      if (holiday) await update.mutateAsync({ id: holiday.id, ...payload });
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
      title={holiday ? 'Modifier le jour férié' : 'Ajouter un jour férié'}
      footer={
        <ModalActions
          onCancel={onClose}
          onConfirm={() => void submit()}
          confirmLabel={holiday ? 'Enregistrer' : 'Ajouter'}
          loading={pending}
        />
      }
    >
      <form onSubmit={submit} className="page-stack" style={{ gap: 'var(--space-4)' }}>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <TextField
          label="Date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <TextField
          label="Libellé"
          placeholder="Ex. Fête du Vodoun"
          maxLength={150}
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
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
