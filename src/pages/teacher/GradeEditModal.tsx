import { useState, type FormEvent } from 'react';

import { errorMessage, gradesApi, type Grade } from '../../api';
import { Alert, Chip, Modal, ModalActions, TextAreaField, TextField, useToast } from '../../ui';

/**
 * Correction d'une note existante.
 *
 * Seules la valeur et le commentaire se modifient ici : le type et le barème
 * appartiennent désormais à l'évaluation et se changent sur elle. Le
 * commentaire est visible par la famille — le seul champ qui sorte de
 * l'établissement, d'où le rappel explicite.
 */
export function GradeEditModal({
  grade, subtitle, onClose,
}: {
  grade: Grade | null;
  subtitle?: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const update = gradesApi.useUpdateGrade();

  const [value, setValue] = useState(String(grade?.value ?? ''));
  const [comment, setComment] = useState(grade?.comment ?? '');
  const [error, setError] = useState<string | null>(null);

  const max = Number(grade?.maxValue ?? 20);
  const numericValue = Number(value);
  const outOfRange =
    value !== '' && (Number.isNaN(numericValue) || numericValue < 0 || numericValue > max);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!grade) return;
    setError(null);
    try {
      await update.mutateAsync({
        id: grade.id,
        value: numericValue,
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

        {grade ? (
          <p className="t-body-md t-muted" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Chip tone="info">{grade.type.label}</Chip>
            <span>noté sur {grade.maxValue}</span>
          </p>
        ) : null}

        <TextField
          label={`Note / ${max}`}
          type="number"
          min={0}
          max={max}
          step={0.25}
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={outOfRange ? `Entre 0 et ${max}.` : undefined}
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
