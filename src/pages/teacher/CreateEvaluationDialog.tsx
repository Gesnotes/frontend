import { useState } from 'react';

import { errorMessage, evaluationsApi, referentialsApi, type Evaluation, type ID } from '../../api';
import { useTermContext } from '../../context/term-context';
import { Alert, Button, Modal, TextField, useToast } from '../../ui';

/**
 * Création d'une évaluation (« Interro du 12/09 »).
 *
 * C'est le geste qui débloque « plusieurs interrogations » : chaque évaluation
 * est une colonne de notes distincte, avec son libellé, sa date et son barème.
 * Le poids reste celui du type choisi.
 */
export function CreateEvaluationDialog({
  open, classId, subjectId, termId, onClose, onCreated,
}: {
  open: boolean;
  classId: ID;
  subjectId: ID;
  termId: ID;
  onClose: () => void;
  onCreated: (evaluation: Evaluation) => void;
}) {
  const toast = useToast();
  const { term } = useTermContext();
  const gradeTypes = referentialsApi.useGradeTypes();
  const create = evaluationsApi.useCreateEvaluation();
  const { term } = useTermContext();

  const [label, setLabel] = useState('');
  const [gradeTypeId, setGradeTypeId] = useState<ID | undefined>(undefined);
  const [date, setDate] = useState('');
  const [maxValue, setMaxValue] = useState('20');
  const [error, setError] = useState<string | null>(null);

  const activeTypeId = gradeTypeId ?? gradeTypes.data?.[0]?.id;
  const max = Number(maxValue);
  const maxValid = max > 0 && max <= 100;
  const baremeError =
    maxValue !== '' && !maxValid ? 'Le barème doit être compris entre 1 et 100.' : undefined;
  const canSubmit = label.trim().length > 0 && activeTypeId !== undefined && maxValid;

  /**
   * Avertissement, pas un refus : une évaluation datée hors des bornes du
   * trimestre est presque toujours une mauvaise période sélectionnée — mais un
   * rattrapage légitime peut tomber après la clôture, et le blocage ferait
   * perdre la saisie.
   */
  const dateOutOfBounds =
    date !== '' &&
    term?.startDate != null &&
    term.endDate != null &&
    (date < term.startDate || date > term.endDate);

  async function submit() {
    if (!activeTypeId) return;
    setError(null);
    try {
      const evaluation = await create.mutateAsync({
        classId,
        subjectId,
        termId,
        gradeTypeId: activeTypeId,
        label: label.trim(),
        date: date || null,
        maxValue: max,
      });
      toast.success('Évaluation créée');
      onCreated(evaluation);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={460}
      title="Nouvelle évaluation"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>Annuler</Button>
          <Button loading={create.isPending} disabled={!canSubmit} onClick={() => void submit()}>
            Créer
          </Button>
        </>
      }
    >
      <div className="page-stack" style={{ gap: 'var(--space-4)' }}>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        {dateOutOfBounds ? (
          <Alert tone="info">
            Cette date est hors de « {term?.label} ». Vérifiez la période sélectionnée avant de
            valider.
          </Alert>
        ) : null}

        <TextField
          label="Intitulé"
          placeholder="Interro du 12/09"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />

        <label className="ui-field">
          <span className="ui-field__label">Type</span>
          <select
            className="ui-select"
            value={activeTypeId ?? ''}
            onChange={(e) => setGradeTypeId(Number(e.target.value))}
          >
            {(gradeTypes.data ?? []).map((type) => (
              <option key={type.id} value={type.id}>
                {type.label} (coef. {type.weight})
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
          <TextField
            label="Date (facultatif)"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <TextField
            label="Barème"
            type="number"
            min={1}
            max={100}
            step={1}
            value={maxValue}
            onChange={(e) => setMaxValue(e.target.value)}
            error={baremeError}
          />
        </div>

        {dateOutOfBounds ? (
          <Alert tone="info">
            Cette date est hors du trimestre « {term?.label} ». Vérifiez la période sélectionnée
            avant de valider.
          </Alert>
        ) : null}
      </div>
    </Modal>
  );
}
