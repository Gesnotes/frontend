import { useState } from 'react';

import { errorMessage, studentsApi, type Student } from '../../api';
import { Alert, Button, Modal, TextField, useToast } from '../../ui';

/**
 * Suppression d'un élève : archivage, ou effacement définitif.
 *
 * L'archivage reste le geste normal — l'élève sort des effectifs, ses notes
 * survivent. L'effacement définitif détruit toute sa scolarité et le backend
 * exige, en garde-fou, la saisie de son nom exact. Cet écran reprend la même
 * exigence plutôt que de la subir en 400 : un administrateur doit comprendre
 * ce qu'il fait avant de cliquer, pas après.
 */
export function DeleteStudentDialog({
  student, onClose,
}: { student: Student | null; onClose: () => void }) {
  const toast = useToast();
  const remove = studentsApi.useDeleteStudent();

  const [permanent, setPermanent] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fullName = student ? `${student.firstName} ${student.lastName}` : '';
  const nameMatches = confirmName.trim() === fullName;

  async function submit() {
    if (!student) return;
    setError(null);
    try {
      await remove.mutateAsync(
        permanent
          ? { id: student.id, permanent: true, confirmName: confirmName.trim() }
          : { id: student.id },
      );
      toast.success(permanent ? 'Élève supprimé définitivement' : 'Élève archivé');
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <Modal
      open={student !== null}
      onClose={onClose}
      width={480}
      title={permanent ? 'Supprimer définitivement ?' : "Archiver l'élève ?"}
      subtitle={fullName}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={remove.isPending}>
            Annuler
          </Button>
          <Button
            variant={permanent ? 'danger-solid' : 'primary'}
            loading={remove.isPending}
            disabled={permanent && !nameMatches}
            onClick={() => void submit()}
          >
            {permanent ? 'Supprimer définitivement' : 'Archiver'}
          </Button>
        </>
      }
    >
      <div className="page-stack" style={{ gap: 'var(--space-4)' }}>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <p className="t-body-md t-muted">
          {permanent
            ? "L'élève, ses notes et son rattachement aux parents sont effacés. Les bulletins passés le perdront aussi. Cette action est irréversible."
            : "L'élève sort des effectifs et des bulletins à venir. Ses notes sont conservées et il peut être restauré depuis les archives."}
        </p>

        <label className="ui-checkbox" style={{ alignSelf: 'flex-start' }}>
          <input
            type="checkbox"
            checked={permanent}
            onChange={(e) => {
              setPermanent(e.target.checked);
              setConfirmName('');
              setError(null);
            }}
          />
          Supprimer définitivement plutôt qu'archiver
        </label>

        {permanent ? (
          <>
            <Alert tone="danger">
              Aucune restauration possible. Préférez l'archivage en cas de doute.
            </Alert>
            <TextField
              label="Saisissez le nom exact pour confirmer"
              placeholder={fullName}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              error={
                confirmName && !nameMatches ? `Attendu : « ${fullName} ».` : undefined
              }
            />
          </>
        ) : null}
      </div>
    </Modal>
  );
}
