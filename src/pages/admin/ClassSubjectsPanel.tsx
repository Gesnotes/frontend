import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { errorMessage, subjectsApi, type ID, type Subject } from '../../api';
import { paths } from '../../routes/paths';
import { Alert, Button, Card, Chip, SectionTitle, Skeleton, TextField, useToast } from '../../ui';

/**
 * Matières rattachées à une classe, gérées depuis la fiche de la classe.
 *
 * Le modèle n'a pas de « programme de classe » : une matière est rattachée à
 * une classe par le coefficient qu'on lui donne pour cette classe
 * (`SubjectCoefficient`), et/ou par l'affectation d'un enseignant. Une matière
 * sans entrée reste enseignable avec le coefficient de l'école ; on la signale
 * quand un professeur y est déjà affecté, pour que l'administration voie ce qui
 * est réellement enseigné.
 *
 * Cet écran **rattache**, il ne crée pas : il ne cherche que parmi les matières
 * déjà au programme de l'école. La création vit sur `/admin/matieres`, et les
 * libellés doivent le dire — « Ajouter une matière » promettait ici une action
 * impossible.
 */
export function ClassSubjectsPanel({ classId }: { classId: ID }) {
  const subjects = subjectsApi.useSubjects();

  if (subjects.isPending) {
    return (
      <Card padded>
        <SectionTitle>Matières de la classe</SectionTitle>
        <Skeleton height={140} />
      </Card>
    );
  }

  if (subjects.isError) {
    return (
      <Card padded>
        <SectionTitle>Matières de la classe</SectionTitle>
        <Alert tone="danger">
          La liste des matières n'a pas pu être chargée.{' '}
          <button
            type="button"
            className="ui-btn ui-btn--ghost ui-btn--sm"
            onClick={() => void subjects.refetch()}
          >
            Réessayer
          </button>
        </Alert>
      </Card>
    );
  }

  return <Panel classId={classId} allSubjects={subjects.data ?? []} />;
}

type Row = {
  subject: Subject;
  /** Coefficient propre à la classe, `null` si la matière suit le défaut école. */
  override: number | null;
  effective: number;
  /** Noms des enseignants affectés à cette matière dans cette classe. */
  teachers: string[];
};

function Panel({ classId, allSubjects }: { classId: ID; allSubjects: Subject[] }) {
  const toast = useToast();
  const setCoef = subjectsApi.useSetSubjectCoefficient();

  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { rows, addable } = useMemo(() => {
    const linked: Row[] = [];
    const rest: Subject[] = [];

    for (const subject of allSubjects) {
      if (subject.archivedAt) continue;

      const override = subject.coefficientsParClasse.find((c) => c.classId === classId);
      const teachers = subject.enseignants
        .filter((t) => t.classId === classId)
        .map((t) => [t.firstName, t.lastName].filter(Boolean).join(' ').trim())
        .filter(Boolean);

      // Rattachée si elle a un coefficient propre OU un enseignant dans la classe.
      if (override || teachers.length > 0) {
        linked.push({
          subject,
          override: override ? Number(override.coefficient) : null,
          effective: override ? Number(override.coefficient) : subject.coefficient,
          teachers,
        });
      } else {
        rest.push(subject);
      }
    }

    linked.sort((a, b) => a.subject.name.localeCompare(b.subject.name, 'fr'));
    return { rows: linked, addable: rest };
  }, [allSubjects, classId]);

  const query = search.trim().toLowerCase();
  const matches = query
    ? addable.filter((s) => s.name.toLowerCase().includes(query))
    : addable;

  async function add(subject: Subject, coefficient: number) {
    setError(null);
    try {
      await setCoef.mutateAsync({ id: subject.id, classId, coefficient });
      toast.success(`${subject.name} rattachée à la classe (coef. ${coefficient})`);
      setSearch('');
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <Card padded>
      <SectionTitle
        aside={<span className="t-label-sm t-subtle" style={{ textTransform: 'none' }}>{rows.length} matière{rows.length > 1 ? 's' : ''}</span>}
      >
        Matières de la classe
      </SectionTitle>

      {error ? (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}

      {/*
        Rattachement, pas création : ce champ ne cherche que parmi les
        matières déjà au programme de l'école. Le mode d'emploi se voit dans
        l'écran (chercher → + Ajouter) plutôt que de se lire dans un
        paragraphe : voir la maquette « Rattacher une matière ».
      */}
      <TextField
        label="Rattacher une matière"
        placeholder="Rechercher parmi les matières de l'école…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {search.trim() ? (
        matches.length === 0 ? (
          <p className="t-body-md t-muted" style={{ margin: 'var(--space-3) 0 var(--space-4)' }}>
            Aucun résultat pour « {search.trim()} ». <Link to={paths.admin.subjects}>Créer une matière</Link>
          </p>
        ) : (
          <div className="list-rows" style={{ margin: 'var(--space-3) 0 var(--space-4)' }}>
            {matches.slice(0, 6).map((subject) => (
              <div key={subject.id} className="list-row">
                <div className="list-row__body">
                  <div className="list-row__title">{subject.name}</div>
                  <div className="list-row__meta">coef. école × {subject.coefficient}</div>
                </div>
                <Button size="sm" loading={setCoef.isPending} onClick={() => void add(subject, subject.coefficient)}>
                  + Ajouter
                </Button>
              </div>
            ))}
          </div>
        )
      ) : null}

      {/* --- Matières rattachées --- */}
      {rows.length === 0 ? (
        <p className="t-body-md t-muted">
          Aucune matière rattachée pour l'instant. Recherchez-en une ci-dessus, ou affectez un
          enseignant à cette classe depuis l'écran <Link to={paths.admin.teachers}>Enseignants</Link>.
        </p>
      ) : (
        <div className="list-rows">
          {rows.map((row) => (
            <LinkedSubjectRow
              key={row.subject.id}
              row={row}
              classId={classId}
              onError={setError}
            />
          ))}
        </div>
      )}

      <p className="t-label-sm t-subtle" style={{ marginTop: 'var(--space-4)', textTransform: 'none' }}>
        Modifier un coefficient recalcule aussitôt les moyennes et le bulletin de la classe.
      </p>
    </Card>
  );
}

function LinkedSubjectRow({
  row, classId, onError,
}: { row: Row; classId: ID; onError: (message: string | null) => void }) {
  const toast = useToast();
  const setCoef = subjectsApi.useSetSubjectCoefficient();
  const removeCoef = subjectsApi.useRemoveSubjectCoefficient();

  const [draft, setDraft] = useState(String(row.effective));
  const dirty = draft.trim() !== '' && Number(draft) !== row.effective;

  async function save() {
    onError(null);
    const value = Number(draft);
    if (Number.isNaN(value) || value <= 0 || value > 99.99) {
      onError(`Coefficient invalide pour ${row.subject.name} : attendu entre 0,01 et 99,99.`);
      return;
    }
    try {
      await setCoef.mutateAsync({ id: row.subject.id, classId, coefficient: value });
      toast.success(`${row.subject.name} · coefficient ${value}`);
    } catch (cause) {
      onError(errorMessage(cause));
    }
  }

  async function reset() {
    onError(null);
    try {
      await removeCoef.mutateAsync({ id: row.subject.id, classId });
      toast.success(`${row.subject.name} revient au coefficient de l'école`);
    } catch (cause) {
      onError(errorMessage(cause));
    }
  }

  return (
    <div className="list-row">
      <div className="list-row__body">
        <div className="list-row__title">
          {row.subject.name}{' '}
          {row.override === null ? (
            <Chip tone="neutral">coef. école</Chip>
          ) : (
            <Chip tone="info">coef. propre</Chip>
          )}
        </div>
        <div className="list-row__meta">
          {row.teachers.length > 0
            ? `Enseigné par ${row.teachers.join(', ')}`
            : 'Aucun enseignant affecté dans cette classe'}
        </div>
      </div>

      <input
        className="ui-input"
        style={{ width: 84 }}
        type="number"
        min={0.01}
        max={99.99}
        step={0.5}
        aria-label={`Coefficient de ${row.subject.name}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />

      <Button size="sm" variant="tonal" disabled={!dirty || setCoef.isPending} onClick={() => void save()}>
        Enregistrer
      </Button>

      <Button
        size="sm"
        variant="ghost"
        disabled={row.override === null || removeCoef.isPending}
        title={row.override === null ? "Cette matière suit déjà le coefficient de l'école" : undefined}
        onClick={() => void reset()}
      >
        Coef. école
      </Button>
    </div>
  );
}
