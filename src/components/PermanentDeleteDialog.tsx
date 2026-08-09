import { useState } from 'react';

import { errorMessage } from '../api';
import { Alert, Button, Modal, TextField } from '../ui';

/**
 * Suppression définitive d'un élément archivé.
 *
 * Le backend refuse l'opération dès que des données en dépendent — élèves
 * rattachés à une classe, notes saisies dans une matière ou par un enseignant —
 * et renvoie alors un 409 portant le décompte exact. Ce message est plus utile
 * que n'importe quelle formulation générique : il est affiché tel quel.
 */
export function PermanentDeleteDialog({
  open, title, description, confirmName, pending, onCancel, onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  /**
   * Nom exact à ressaisir. Le backend l'exige pour un élève, dont la
   * suppression efface toute la scolarité.
   */
  confirmName?: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (typedName: string) => Promise<void>;
}) {
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);

  const matches = !confirmName || typed.trim() === confirmName;

  async function submit() {
    setError(null);
    try {
      await onConfirm(typed.trim());
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      width={460}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={pending}>Annuler</Button>
          <Button
            variant="danger-solid"
            loading={pending}
            disabled={!matches}
            onClick={() => void submit()}
          >
            Supprimer définitivement
          </Button>
        </>
      }
    >
      <div className="page-stack" style={{ gap: 'var(--space-4)' }}>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <p className="t-body-md t-muted">{description}</p>

        <Alert tone="danger">
          Aucune restauration possible. L'élément archivé reste consultable ici tant qu'il n'est
          pas supprimé — laissez-le archivé en cas de doute.
        </Alert>

        {confirmName ? (
          <TextField
            label="Saisissez le nom exact pour confirmer"
            placeholder={confirmName}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            error={typed && !matches ? `Attendu : « ${confirmName} ».` : undefined}
          />
        ) : null}
      </div>
    </Modal>
  );
}
