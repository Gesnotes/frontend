import { useState } from 'react';

import { errorMessage, evaluationsApi, referentialsApi, type Evaluation, type ID } from '../../api';
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
  const gradeTypes = referentialsApi.useGradeTypes();
  const create = evaluationsApi.useCreateEvaluation();

  const [label, setLabel] = useState('');
  const [gradeTypeId, setGradeTypeId] = useState<ID | undefined>(undefined);
  const [date, setDate] = useState('');
  const [maxValue, setMaxValue] = useState('20');
  const [error, setError] = useState<string | null>(null);

  const activeTypeId = gradeTypeId ?? gradeTypes.data?.[0]?.id;
  const max = Number(maxValue);
  const canSubmit = label.trim().length > 0 && activeTypeId !== undefined && max > 0;

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

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <TextField
            label="Date (facultatif)"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <label className="ui-field" style={{ maxWidth: 120 }}>
            <span className="ui-field__label">Barème</span>
            <input
              className="ui-input"
              type="number"
              min={1}
              step={1}
              value={maxValue}
              onChange={(e) => setMaxValue(e.target.value)}
            />
          </label>
        </div>
      </div>
    </Modal>
  );
}
