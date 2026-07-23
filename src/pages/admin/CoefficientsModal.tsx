import { useState } from 'react';

import { classesApi, errorMessage, subjectsApi, type ID, type Subject } from '../../api';
import { Alert, Button, Modal, Skeleton, useToast } from '../../ui';

/**
 * Coefficients d'une matière, classe par classe.
 *
 * Le coefficient de l'école ne convient pas partout : la philosophie pèse 4 en
 * terminale et n'est pas enseignée en sixième. Sans cet écran, ces surcharges
 * n'existaient qu'en base et l'administration ne pouvait ni les créer ni les
 * corriger — alors qu'elles changent directement les moyennes des bulletins.
 */
export function CoefficientsModal({
  subject, onClose,
}: { subject: Subject | null; onClose: () => void }) {
  const toast = useToast();
  const classes = classesApi.useClasses();
  const setCoefficient = subjectsApi.useSetSubjectCoefficient();
  const removeCoefficient = subjectsApi.useRemoveSubjectCoefficient();

  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  const overrides = new Map(
    (subject?.coefficientsParClasse ?? []).map((c) => [c.classId, c.coefficient]),
  );

  async function apply(classId: ID, className: string) {
    if (!subject) return;
    setError(null);
    const raw = drafts[classId];
    const value = Number(raw);

    if (!raw || Number.isNaN(value) || value <= 0 || value > 99.99) {
      setError(`Coefficient invalide pour ${className} : attendu entre 0,01 et 99,99.`);
      return;
    }

    try {
      await setCoefficient.mutateAsync({ id: subject.id, classId, coefficient: value });
      setDrafts((current) => {
        const next = { ...current };
        delete next[classId];
        return next;
      });
      toast.success(`${subject.name} · ${className} : coefficient ${value}`);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function reset(classId: ID, className: string) {
    if (!subject) return;
    setError(null);
    try {
      await removeCoefficient.mutateAsync({ id: subject.id, classId });
      toast.success(`${className} revient au coefficient de l'école`);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  const pending = setCoefficient.isPending || removeCoefficient.isPending;

  return (
    <Modal
      open={subject !== null}
      onClose={onClose}
      width={560}
      title="Coefficients par classe"
      subtitle={
        subject
          ? `${subject.name} — coefficient de l'école : × ${subject.coefficient}`
          : undefined
      }
      footer={
        <Button variant="secondary" onClick={onClose}>Fermer</Button>
      }
    >
      <div className="page-stack" style={{ gap: 'var(--space-4)' }}>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <Alert tone="info">
          Une classe sans coefficient propre utilise celui de l'école. Modifier un coefficient
          recalcule immédiatement les moyennes et les bulletins de la classe concernée.
        </Alert>

        {classes.isPending ? (
          <Skeleton height={200} />
        ) : (
          <div className="list-rows">
            {(classes.data ?? []).map((klass) => {
              const override = overrides.get(klass.id);
              const draft = drafts[klass.id] ?? String(override ?? subject?.coefficient ?? '');
              const dirty = drafts[klass.id] !== undefined;

              return (
                <div key={klass.id} className="list-row">
                  <div className="list-row__body">
                    <div className="list-row__title">{klass.name}</div>
                    <div className="list-row__meta">
                      {override === undefined
                        ? "Coefficient de l'école"
                        : `Coefficient propre : × ${override}`}
                    </div>
                  </div>

                  <input
                    className="ui-input"
                    style={{ width: 90 }}
                    type="number"
                    min={0.01}
                    max={99.99}
                    step={0.5}
                    aria-label={`Coefficient de ${subject?.name ?? ''} en ${klass.name}`}
                    value={draft}
                    onChange={(e) =>
                      setDrafts((current) => ({ ...current, [klass.id]: e.target.value }))
                    }
                  />

                  <Button
                    size="sm"
                    variant="tonal"
                    disabled={!dirty || pending}
                    onClick={() => void apply(klass.id, klass.name)}
                  >
                    Appliquer
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={override === undefined || pending}
                    onClick={() => void reset(klass.id, klass.name)}
                  >
                    Rétablir
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
