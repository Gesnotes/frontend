import { useState } from 'react';

import { safeFilename } from '../lib/download';
import { Modal, ModalActions, TextField } from '../ui';

/**
 * Nom de fichier modifiable avant un téléchargement.
 *
 * Les exports (bulletin CSV, PDF...) proposaient jusqu'ici un nom généré
 * automatiquement, sans possibilité de le changer. Cette modale s'intercale
 * juste avant `downloadBlob` : `defaultName` la préremplit, l'école peut le
 * réécrire entièrement avant de confirmer.
 */
export function ExportFilenameModal({
  open, defaultName, extension, onClose, onConfirm,
}: {
  open: boolean;
  /** Nom proposé, sans extension — déjà passé par `safeFilename`. */
  defaultName: string;
  /** Sans le point, ex. "csv". */
  extension: string;
  onClose: () => void;
  /** Reçoit le nom final, extension comprise, prêt pour `downloadBlob`. */
  onConfirm: (filename: string) => void;
}) {
  // `null` tant que l'utilisateur n'a rien touché : le champ suit alors
  // `defaultName` en direct (dérivé au rendu, pas un `useState(defaultName)`
  // qui ne capturerait sa valeur qu'au tout premier montage — cette modale
  // reste montée derrière `Modal` même fermée, `defaultName` change à
  // chaque nouvel export sans que le composant ne se remonte).
  const [edited, setEdited] = useState<string | null>(null);
  const name = edited ?? defaultName;

  function handleClose() {
    setEdited(null);
    onClose();
  }

  function confirm() {
    const cleaned = safeFilename(name) || defaultName;
    setEdited(null);
    onConfirm(`${cleaned}.${extension}`);
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Nom du fichier"
      footer={<ModalActions onCancel={handleClose} onConfirm={confirm} confirmLabel="Télécharger" />}
    >
      <TextField
        label="Nom du fichier"
        value={name}
        onChange={(e) => setEdited(e.target.value)}
        hint={`Enregistré sous « ${safeFilename(name) || defaultName}.${extension} »`}
      />
    </Modal>
  );
}
