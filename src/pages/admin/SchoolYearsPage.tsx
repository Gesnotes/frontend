import { useState, type FormEvent } from 'react';

import {
  classesApi, errorMessage, isApiError, schoolYearsApi, type SchoolYear,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { formatCount, formatDate, plural } from '../../lib/format';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import {
  Alert, Button, Card, Chip, ConfirmDialog, DataTable, EmptyState, Modal, ModalActions,
  SelectField, Skeleton, TextField, useToast, type Column,
} from '../../ui';

/**
 * Années scolaires.
 *
 * Le même geste qu'archiver une classe ou une période aujourd'hui — rien de
 * nouveau à apprendre. « Préparer la rentrée suivante » copie les classes
 * (mode, référent, coefficients) vers l'année visée ; les élèves n'y sont
 * jamais copiés, ça se décide à la réinscription.
 */
export default function SchoolYearsPage() {
  const toast = useToast();
  const years = schoolYearsApi.useSchoolYears();
  const archive = schoolYearsApi.useArchiveSchoolYear();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SchoolYear | null>(null);
  const [preparing, setPreparing] = useState<SchoolYear | null>(null);
  const [toArchive, setToArchive] = useState<SchoolYear | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);

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

  const columns: Column<SchoolYear>[] = [
    {
      key: 'label',
      header: 'Année',
      render: (year) => (
        <div className="cell-person">
          <span style={{ fontWeight: 600 }}>{year.label}</span>
          {year.isCurrent ? <Chip tone="success">Année en cours</Chip> : null}
        </div>
      ),
    },
    {
      key: 'dates',
      header: 'Dates',
      render: (year) => (
        <span className="t-muted">
          {year.startDate ? `${formatDate(year.startDate)} → ${formatDate(year.endDate)}` : '—'}
        </span>
      ),
    },
    {
      key: 'content',
      header: 'Contenu',
      render: (year) => (
        <Chip tone="neutral">
          {formatCount(year.classCount)} {plural(year.classCount, 'classe')} ·{' '}
          {formatCount(year.termCount)} {plural(year.termCount, 'période')}
        </Chip>
      ),
    },
    {
      key: 'actions',
      srHeader: 'Actions',
      align: 'numeric',
      render: (year) => (
        <div className="cell-actions">
          <Button size="sm" variant="tonal" onClick={() => setPreparing(year)}>
            Préparer la rentrée suivante
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setEditing(year)}>Modifier</Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              setArchiveError(null);
              setToArchive(year);
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
        title="Années scolaires"
        subtitle="Regroupent les périodes et les classes d'une même rentrée"
        actions={<Button onClick={() => setCreating(true)}>+ Nouvelle année scolaire</Button>}
      />
      <PageContent>
        <div className="page-stack">
          <QueryBoundary query={years} loading={<TableSkeleton />}>
            {(items) => (
              <DataTable
                caption="Années scolaires"
                columns={columns}
                rows={items}
                rowKey={(year) => String(year.id)}
                empty={
                  <EmptyState
                    icon="⟳"
                    title="Aucune année scolaire"
                    description="Rattacher classes et périodes à une année scolaire est facultatif — créez-en une pour préparer une rentrée à l'avance."
                    action={{ label: 'Nouvelle année scolaire', onClick: () => setCreating(true) }}
                  />
                }
              />
            )}
          </QueryBoundary>
        </div>
      </PageContent>

      <SchoolYearModal
        key={editing?.id ?? 'new'}
        open={creating || editing !== null}
        year={editing}
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

      <PrepareNextYearModal
        source={preparing}
        otherYears={(years.data ?? []).filter((y) => y.id !== preparing?.id)}
        onClose={() => setPreparing(null)}
      />

      <ConfirmDialog
        open={toArchive !== null}
        title={`Archiver « ${toArchive?.label ?? ''} » ?`}
        description={
          archiveError ??
          "L'année sort des sélecteurs, mais rien n'est perdu : ses classes et ses périodes restent en base, seulement détachées de son regroupement. Vous pouvez la restaurer — ou la supprimer définitivement — depuis les Archives."
        }
        confirmLabel="Archiver"
        loading={archive.isPending}
        onCancel={() => setToArchive(null)}
        onConfirm={() => void confirmArchive()}
      />
    </>
  );
}

function SchoolYearModal({
  open, year, onClose, onSaved,
}: { open: boolean; year: SchoolYear | null; onClose: () => void; onSaved: (label: string) => void }) {
  const create = schoolYearsApi.useCreateSchoolYear();
  const update = schoolYearsApi.useUpdateSchoolYear();

  const [label, setLabel] = useState(year?.label ?? '');
  const [startDate, setStartDate] = useState(year?.startDate ?? '');
  const [endDate, setEndDate] = useState(year?.endDate ?? '');
  const [error, setError] = useState<string | null>(null);

  const pending = create.isPending || update.isPending;
  const halfBounded = Boolean(startDate) !== Boolean(endDate);
  const inverted = Boolean(startDate && endDate && startDate > endDate);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    setError(null);
    const payload = { label: label.trim(), startDate: startDate || null, endDate: endDate || null };
    try {
      if (year) await update.mutateAsync({ id: year.id, ...payload });
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
      title={year ? "Modifier l'année scolaire" : 'Créer une année scolaire'}
      subtitle="Les dates servent à repérer l'année en cours."
      footer={
        <ModalActions
          onCancel={onClose}
          onConfirm={() => void submit()}
          confirmLabel={year ? 'Enregistrer' : "Créer l'année"}
          loading={pending}
        />
      }
    >
      <form onSubmit={submit} className="page-stack" style={{ gap: 'var(--space-4)' }}>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <TextField
          label="Libellé"
          placeholder="Ex. 2026-2027"
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
          Renseignez les deux dates ou aucune. Deux années ne peuvent pas se chevaucher.
        </span>
      </form>
    </Modal>
  );
}

/**
 * Prépare la rentrée suivante : reprend les classes actives de l'année
 * source vers l'année cible, avec leur mode, leur référent et leurs
 * coefficients. Chaque classe échoue indépendamment (nom déjà pris, déjà
 * préparée) — l'aperçu annonce le nombre concerné avant de lancer l'opération.
 */
function PrepareNextYearModal({
  source, otherYears, onClose,
}: { source: SchoolYear | null; otherYears: SchoolYear[]; onClose: () => void }) {
  const toast = useToast();
  const classes = classesApi.useClasses(undefined, false, source?.id);
  const duplicate = classesApi.useDuplicateClass();

  const [targetYearId, setTargetYearId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const eligible = (classes.data ?? []).filter((klass) => klass.promotesToId === null);
  const alreadyPrepared = (classes.data ?? []).length - eligible.length;

  async function submit() {
    if (!source || !targetYearId) return;
    setError(null);
    setRunning(true);
    try {
      const results = await Promise.allSettled(
        eligible.map((klass) =>
          duplicate.mutateAsync({ id: klass.id, schoolYearId: Number(targetYearId) }),
        ),
      );
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - ok;
      if (ok > 0) {
        toast.success(
          `${ok} ${plural(ok, 'classe')} préparée${ok > 1 ? 's' : ''} pour la rentrée suivante`,
        );
      }
      if (failed > 0) {
        toast.error(`${failed} ${plural(failed, 'classe')} n'${failed > 1 ? 'ont' : 'a'} pas pu être préparée${failed > 1 ? 's' : ''}.`);
      }
      onClose();
      setTargetYearId('');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setRunning(false);
    }
  }

  return (
    <Modal
      open={source !== null}
      onClose={onClose}
      title={`Préparer la rentrée suivante depuis « ${source?.label ?? ''} »`}
      subtitle="Les élèves ne sont pas copiés — ça se décide à la réinscription."
      footer={
        <ModalActions
          onCancel={onClose}
          onConfirm={() => void submit()}
          confirmLabel="Préparer la rentrée"
          loading={running}
        />
      }
    >
      <div className="page-stack" style={{ gap: 'var(--space-4)' }}>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        {otherYears.length === 0 ? (
          <Alert tone="info">
            Créez d'abord l'année scolaire cible (ex. l'année suivante) avant de préparer sa rentrée.
          </Alert>
        ) : (
          <SelectField
            label="Vers quelle année scolaire ?"
            placeholder="— Choisir —"
            value={targetYearId}
            onChange={(e) => setTargetYearId(e.target.value)}
            options={otherYears.map((y) => ({ value: String(y.id), label: y.label }))}
          />
        )}

        <QueryBoundary query={classes} loading={<Skeleton height={80} />}>
          {() => (
            <p className="t-body-md t-muted">
              {eligible.length === 0
                ? "Aucune classe à préparer : soit cette année n'en a aucune, soit elles sont toutes déjà préparées."
                : `${formatCount(eligible.length)} ${plural(eligible.length, 'classe')} ${eligible.length > 1 ? 'seront copiées' : 'sera copiée'} avec son mode, son référent et ses coefficients.`}
              {alreadyPrepared > 0
                ? ` ${formatCount(alreadyPrepared)} ${plural(alreadyPrepared, 'classe')} déjà préparée${alreadyPrepared > 1 ? 's' : ''} ${alreadyPrepared > 1 ? 'sont ignorées' : 'est ignorée'}.`
                : ''}
            </p>
          )}
        </QueryBoundary>
      </div>
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
