import { useState, type FormEvent } from 'react';

import { errorMessage, gradesApi, type Grade, type GradeType, type ID } from '../../api';
import {
  Alert, Modal, ModalActions, SelectField, TextAreaField, TextField, useToast,
} from '../../ui';

/**
 * Modification d'une note existante.
 *
 * Le commentaire est visible par la famille : c'est le seul champ de
 * l'application qui sorte de l'établissement, d'où le rappel explicite.
 */
export function GradeEditModal({
  grade, gradeTypes, subtitle, onClose,
}: {
  grade: Grade | null;
  gradeTypes: GradeType[];
  subtitle?: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const update = gradesApi.useUpdateGrade();

  const [value, setValue] = useState(String(grade?.value ?? ''));
  const [maxValue, setMaxValue] = useState(String(grade?.maxValue ?? 20));
  const [gradeTypeId, setGradeTypeId] = useState(String(grade?.type.id ?? ''));
  const [comment, setComment] = useState(grade?.comment ?? '');
  const [error, setError] = useState<string | null>(null);

  const numericValue = Number(value);
  const numericMax = Number(maxValue);
  const outOfRange =
    value !== '' && (Number.isNaN(numericValue) || numericValue < 0 || numericValue > numericMax);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!grade) return;
    setError(null);
    try {
      await update.mutateAsync({
        id: grade.id,
        value: numericValue,
        maxValue: numericMax,
        gradeTypeId: Number(gradeTypeId) as ID,
        // Chaîne vide envoyée en `null` : le backend distingue « pas de
        // commentaire » de « champ non modifié ».
        comment: comment.trim() || null,
      });
      toast.success('Note modifiée — la famille est notifiée du changement');
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <Modal
      open={grade !== null}
      onClose={onClose}
      title="Modifier la note"
      subtitle={subtitle}
      footer={
        <ModalActions
          onCancel={onClose}
          onConfirm={() => void submit()}
          confirmLabel="Enregistrer"
          loading={update.isPending}
        />
      }
    >
      <form onSubmit={submit} className="page-stack" style={{ gap: 'var(--space-4)' }}>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <TextField
            label="Note"
            type="number"
            min={0}
            max={numericMax}
            step={0.25}
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            error={outOfRange ? `Entre 0 et ${maxValue}.` : undefined}
          />
          <TextField
            label="Barème"
            type="number"
            min={1}
            step={1}
            required
            value={maxValue}
            onChange={(e) => setMaxValue(e.target.value)}
          />
        </div>

        <SelectField
          label="Type"
          required
          value={gradeTypeId}
          onChange={(e) => setGradeTypeId(e.target.value)}
          options={gradeTypes.map((t) => ({
            value: String(t.id),
            label: `${t.label} (coef. ${t.weight})`,
          }))}
        />

        <TextAreaField
          label="Commentaire"
          hint="Visible par la famille."
          maxLength={2000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </form>
    </Modal>
  );
}
