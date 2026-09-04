import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  classesApi, errorMessage, isApiError, referentialsApi, schoolYearsApi,
  type SchoolYear, type Term,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { formatCount, formatDate, plural } from '../../lib/format';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import {
  Alert, Button, Card, Chip, ConfirmDialog, DataTable, EmptyState, Modal, ModalActions,
  SelectField, Skeleton, TextField, useToast, type Column,
} from '../../ui';

type Tab = 'years' | 'periods';

/**
 * Années scolaires et périodes, un seul écran.
 *
 * Deux référentiels distincts côté backend (une année scolaire regroupe des
 * périodes, le rattachement est facultatif), mais une seule question pour
 * l'administration : « comment est découpée l'année ? ». Les regrouper évite
 * de faire deviner dans quel onglet chercher l'un ou l'autre.
 */
export default function SchoolYearsPage() {
  const [searchParams] = useSearchParams();
  const initialTab: Tab = searchParams.get('tab') === 'periods' ? 'periods' : 'years';
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <>
      <PageHeader
        title="Années scolaires et périodes"
        subtitle="Le découpage de l'année : rentrées, trimestres ou semestres"
      />
      <PageContent>
        <div className="page-stack">
          <div className="page-toolbar" role="tablist" aria-label="Affichage">
            <Button
              role="tab"
              aria-selected={tab === 'years'}
              variant={tab === 'years' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTab('years')}
            >
              Années scolaires
            </Button>
            <Button
              role="tab"
              aria-selected={tab === 'periods'}
              variant={tab === 'periods' ? 'primary' : 'secondary'}
              size="sm"
              data-tour="admin-tab-periodes"
              onClick={() => setTab('periods')}
            >
              Périodes
            </Button>
          </div>

          {tab === 'years' ? <YearsSection /> : <PeriodsSection />}
        </div>
      </PageContent>
    </>
  );
}

/**
 * Années scolaires.
 *
 * Le même geste qu'archiver une classe ou une période aujourd'hui — rien de
 * nouveau à apprendre. « Préparer la rentrée suivante » copie les classes
 * (mode, référent, coefficients) vers l'année visée ; les élèves n'y sont
 * jamais copiés, ça se décide à la réinscription.
 */
function YearsSection() {
  const toast = useToast();
  const years = schoolYearsApi.useSchoolYears();
  const archive = schoolYearsApi.useArchiveSchoolYear();

  const [creating, setCreating] = useState(false);
  // Formulaire partagé création/modification : sans ce compteur, la clé du
  // modal ne changeait pas entre deux créations d'affilée et l'année scolaire
  // précédemment saisie restait affichée à la réouverture.
  const [creationKey, setCreationKey] = useState(0);
  const [editing, setEditing] = useState<SchoolYear | null>(null);
  const [preparing, setPreparing] = useState<SchoolYear | null>(null);
  const [toArchive, setToArchive] = useState<SchoolYear | null>(null);
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
    <div className="page-stack">
      <div className="page-toolbar" style={{ justifyContent: 'flex-end' }}>
        <Button data-tour="admin-open-annee" onClick={openCreate}>+ Nouvelle année scolaire</Button>
      </div>

      <QueryBoundary query={years} loading={<YearsTableSkeleton />}>
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
                action={{ label: 'Nouvelle année scolaire', onClick: openCreate }}
              />
            }
          />
        )}
      </QueryBoundary>

      <SchoolYearModal
        key={editing ? editing.id : `new-${creationKey}`}
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
    </div>
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
          data-tour="admin-annee-libelle"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <TextField
            label="Début"
            type="date"
            data-tour="admin-annee-debut"
            value={startDate ?? ''}
            onChange={(e) => setStartDate(e.target.value)}
            error={halfBounded && !startDate ? 'Date manquante.' : undefined}
          />
          <TextField
            label="Fin"
            type="date"
            data-tour="admin-annee-fin"
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

function YearsTableSkeleton() {
  return (
    <Card padded>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} height={44} style={{ marginBottom: 12 }} />
      ))}
    </Card>
  );
}

/**
 * Périodes scolaires.
 *
 * Rien ne se consulte sans elles : le détail d'une classe, un bulletin ou la
 * fiche d'un enfant exigent tous un `term_id`. Un établissement sans période
 * configurée est un établissement bloqué au premier écran.
 */
function PeriodsSection() {
  const toast = useToast();
  const terms = referentialsApi.useTerms();
  const archive = referentialsApi.useArchiveTerm();
  const closeEntry = referentialsApi.useCloseTermEntry();

  const [creating, setCreating] = useState(false);
  // Formulaire partagé création/modification : sans ce compteur, la clé du
  // modal ne changeait pas entre deux créations d'affilée et la période
  // précédemment saisie restait affichée à la réouverture.
  const [creationKey, setCreationKey] = useState(0);
  const [editing, setEditing] = useState<Term | null>(null);
  const [toArchive, setToArchive] = useState<Term | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [toReopen, setToReopen] = useState<Term | null>(null);

  function openCreate() {
    setCreationKey((key) => key + 1);
    setCreating(true);
  }

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
    <div className="page-stack">
      <Alert tone="info">
        Toutes les moyennes et tous les bulletins sont calculés par période. Sans période
        configurée, l'application ne peut afficher aucun résultat.
      </Alert>

      <div className="page-toolbar" style={{ justifyContent: 'flex-end' }}>
        <Button data-tour="admin-add-periode" onClick={openCreate}>Créer une période</Button>
      </div>

      <QueryBoundary query={terms} loading={<PeriodsTableSkeleton />}>
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
                action={{ label: 'Créer une période', onClick: openCreate }}
              />
            }
          />
        )}
      </QueryBoundary>

      <TermModal
        key={editing ? editing.id : `new-${creationKey}`}
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
    </div>
  );
}

/**
 * Jour local, décalé de `days` jours.
 *
 * `toISOString()` convertirait en UTC — décalé du jour réel de l'utilisateur
 * une partie de la journée selon le fuseau — d'où la construction manuelle.
 */
function isoDay(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  const years = schoolYearsApi.useSchoolYears();

  const [label, setLabel] = useState(term?.label ?? '');
  const [startDate, setStartDate] = useState(term?.startDate ?? '');
  const [endDate, setEndDate] = useState(term?.endDate ?? '');
  const [schoolYearId, setSchoolYearId] = useState(term?.schoolYearId != null ? String(term.schoolYearId) : '');
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
      schoolYearId: schoolYearId ? Number(schoolYearId) : null,
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
          data-tour="admin-periode-libelle"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <TextField
            label="Début"
            type="date"
            data-tour="admin-periode-debut"
            value={startDate ?? ''}
            onChange={(e) => setStartDate(e.target.value)}
            error={halfBounded && !startDate ? 'Date manquante.' : undefined}
          />
          <TextField
            label="Fin"
            type="date"
            data-tour="admin-periode-fin"
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

        <SelectField
          label="Année scolaire"
          placeholder="— Aucune —"
          data-tour="admin-periode-annee"
          value={schoolYearId}
          onChange={(e) => setSchoolYearId(e.target.value)}
          options={(years.data ?? []).map((y) => ({ value: String(y.id), label: y.label }))}
          hint="Facultatif — nécessaire pour que la moyenne annuelle de l'élève puisse être calculée."
        />
      </form>
    </Modal>
  );
}

function PeriodsTableSkeleton() {
  return (
    <Card padded>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} height={44} style={{ marginBottom: 12 }} />
      ))}
    </Card>
  );
}
