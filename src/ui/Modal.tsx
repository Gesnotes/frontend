import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: number;
  children: ReactNode;
  footer?: ReactNode;
};

export function Modal({ open, onClose, title, subtitle, width = 460, children, footer }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  /**
   * Focus et défilement : ne dépend que de `open`, pas de `onClose`. Un
   * `onClose` recréé à chaque rendu du parent (cas courant, fonction fléchée
   * inline) ferait sinon rejouer cet effet en boucle pendant que la modale
   * reste ouverte — et capturerait alors le panneau lui-même comme « élément
   * à refocaliser à la fermeture » au lieu du bouton qui l'a ouverte.
   */
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      // Rend le focus à l'élément qui a ouvert la modale : sans ça, un
      // utilisateur au clavier retombe sur `<body>` et doit re-tabuler
      // depuis le haut de la page à chaque fermeture.
      previouslyFocused?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="ui-modal-backdrop" onMouseDown={onClose}>
      <div
        ref={panelRef}
        className="ui-modal"
        style={{ maxWidth: width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="ui-modal__header">
          <div>
            <h2 className="ui-modal__title" id={titleId}>{title}</h2>
            {subtitle ? <p className="ui-modal__subtitle">{subtitle}</p> : null}
          </div>
          <button className="ui-modal__close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="ui-modal__body">{children}</div>
        {footer ? <div className="ui-modal__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

/** Pied de modale standard : annuler + action principale. */
export function ModalActions({
  onCancel, onConfirm, confirmLabel, cancelLabel = 'Annuler', danger = false, loading = false,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <>
      <Button variant="secondary" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
      <Button variant={danger ? 'danger-solid' : 'primary'} onClick={onConfirm} loading={loading}>
        {confirmLabel}
      </Button>
    </>
  );
}

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open, title, description, confirmLabel = 'Confirmer', danger = true, loading = false, onCancel, onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      width={420}
      footer={
        <ModalActions
          onCancel={onCancel}
          onConfirm={onConfirm}
          confirmLabel={confirmLabel}
          danger={danger}
          loading={loading}
        />
      }
    >
      <p className="t-body-md t-muted">{description}</p>
    </Modal>
  );
}
