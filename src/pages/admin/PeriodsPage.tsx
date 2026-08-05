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
  const archive = referentialsApi.useArchiveTerm();
  const closeEntry = referentialsApi.useCloseTermEntry();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Term | null>(null);
  const [toArchive, setToArchive] = useState<Term | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [toReopen, setToReopen] = useState<Term | null>(null);

  async function stopReopening(term: Term) {
    try {
      await closeEntry.mutateAsync(term.id);
      toast.success(`Saisie refermée sur « ${term.label} »`);
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  async function confirmArchive() {
    if (!toArchive) return;
    setArchiveError(null);
    try {
      await archive.mutateAsync(toArchive.id);
      toast.success(`« ${toArchive.label} » archivée`);
      setToArchive(null);
    } catch (cause) {
      setArchiveError(errorMessage(cause));
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
          {/* Une période rouverte reste « terminée » : c'est la saisie qui est
              ouverte, pas le trimestre. Les deux informations comptent. */}
          {term.isClosed ? <Chip tone="neutral">Terminée</Chip> : null}
          {term.reopenedUntil ? (
            <Chip tone="warning">Saisie rouverte jusqu'au {formatDate(term.reopenedUntil)}</Chip>
          ) : null}
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
      srHeader: 'Actions',
      align: 'numeric',
      render: (term) => (
        <div className="cell-actions">
          {/* La réouverture n'a de sens que sur une période terminée : ailleurs,
              la saisie est déjà possible. */}
          {term.isClosed ? (
            term.reopenedUntil ? (
              <Button
                size="sm"
                variant="tonal"
                loading={closeEntry.isPending}
                onClick={() => void stopReopening(term)}
              >
                Refermer la saisie
              </Button>
            ) : (
              <Button size="sm" variant="tonal" onClick={() => setToReopen(term)}>
                Rouvrir la saisie
              </Button>
            )
          ) : null}
          <Button size="sm" variant="tonal" onClick={() => setEditing(term)}>Modifier</Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              setArchiveError(null);
              setToArchive(term);
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

      <ReopenModal
        key={`reopen-${toReopen?.id ?? 'none'}`}
        term={toReopen}
        onClose={() => setToReopen(null)}
        onDone={(label, until) => {
          setToReopen(null);
          toast.success(`Saisie rouverte sur « ${label} » jusqu'au ${formatDate(until)}`);
        }}
      />

      <ConfirmDialog
        open={toArchive !== null}
        title={`Archiver « ${toArchive?.label ?? ''} » ?`}
        description={
          archiveError ??
          "La période sort des sélecteurs et des listes, mais rien n'est perdu : ses évaluations et ses notes restent en base. Vous pouvez la restaurer — ou la supprimer définitivement — depuis les Archives."
        }
        confirmLabel="Archiver"
        loading={archive.isPending}
        onCancel={() => setToArchive(null)}
        onConfirm={() => void confirmArchive()}
      />
    </>
  );
}

/** Jour ISO, décalé de `days` jours. */
function isoDay(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Réouverture de la saisie sur un trimestre terminé.
 *
 * Le besoin réel est le rattrapage : une note oubliée, une copie retrouvée.
 * L'échéance est obligatoire — c'est elle qui distingue une soupape d'une levée
 * pure et simple du verrou, et elle évite d'avoir à penser à refermer.
 */
function ReopenModal({
  term, onClose, onDone,
}: {
  term: Term | null;
  onClose: () => void;
  onDone: (label: string, until: string) => void;
}) {
  const reopen = referentialsApi.useReopenTerm();

  const [until, setUntil] = useState(isoDay(7));
  const [error, setError] = useState<string | null>(null);

  const maxDay = isoDay(90);
  const outOfRange = until !== '' && (until < isoDay(0) || until > maxDay);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!term || outOfRange || !until) return;
    setError(null);
    try {
      // Fin de journée : rouvrir « jusqu'au 12 » doit couvrir le 12 entier,
      // sinon l'échéance tombe à minuit et la journée est perdue.
      const deadline = new Date(`${until}T23:59:59`).toISOString();
      await reopen.mutateAsync({ id: term.id, until: deadline });
      onDone(term.label, deadline);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <Modal
      open={term !== null}
      onClose={onClose}
      width={460}
      title={`Rouvrir la saisie sur « ${term?.label ?? ''} » ?`}
      subtitle="Les enseignants pourront de nouveau saisir et corriger, jusqu'à l'échéance."
      footer={
        <ModalActions
          onCancel={onClose}
          onConfirm={() => void submit()}
          confirmLabel="Rouvrir la saisie"
          loading={reopen.isPending}
        />
      }
    >
      <form onSubmit={submit} className="page-stack" style={{ gap: 'var(--space-4)' }}>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <Alert tone="info">
          Ce trimestre est terminé : la saisie y est verrouillée pour les enseignants. La rouvrir
          évite d'avoir à saisir à leur place, ou à repousser la date de fin — ce qui fausserait la
          période en cours.
        </Alert>

        <TextField
          label="Ouverte jusqu'au"
          type="date"
          required
          min={isoDay(0)}
          max={maxDay}
          value={until}
          onChange={(e) => setUntil(e.target.value)}
          hint="Le verrou se remet seul à cette date, à 23h59. Vous pouvez aussi refermer avant."
          error={outOfRange ? `Choisissez une date entre aujourd'hui et le ${formatDate(maxDay)}.` : undefined}
        />
      </form>
    </Modal>
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
