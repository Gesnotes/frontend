import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { errorMessage, type StoredAccount } from '../api';
import { useAuth } from '../auth/auth-context';
import { spaceLabel } from '../layouts/nav';
import { homePathFor } from '../routes/paths';
import { Alert, Modal, ModalActions, TextField, useToast } from '../ui';

/**
 * Nom de l'école courante + bascule vers un autre compte connu de la même
 * personne (même identifiant détecté dans une autre école, ou compte lié
 * explicitement) — voir `authApi.switchAccount`/`linkAccount`.
 *
 * Repris du motif déjà établi pour les menus contextuels (ex. le menu « … »
 * d'une carte classe) : bouton déclencheur + panneau positionné, fermeture au
 * clic extérieur ou à Échap, focus rendu au déclencheur à la fermeture.
 */
export function AccountSwitcher() {
  const { schoolName, role, accounts, switchAccount } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [linking, setLinking] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const focusWasInsideRef = useRef(false);

  function close() {
    focusWasInsideRef.current = !!ref.current?.contains(document.activeElement);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      if (focusWasInsideRef.current) trigger?.focus();
    };
  }, [open]);

  async function choose(account: StoredAccount) {
    setSwitchingTo(account.userId);
    try {
      await switchAccount(account.userId);
      close();
      if (account.role !== role) navigate(homePathFor(account.role), { replace: true });
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setSwitchingTo(null);
    }
  }

  return (
    <div className="account-switcher" ref={ref}>
      <button
        type="button"
        ref={triggerRef}
        className="account-switcher__trigger"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="account-switcher__school">{schoolName}</span>
        {accounts.length > 0 ? <span className="account-switcher__badge">{accounts.length + 1}</span> : null}
      </button>

      {open ? (
        <div className="account-switcher__panel" role="menu">
          <div className="account-switcher__item account-switcher__item--active">
            <span className="account-switcher__item-school">{schoolName}</span>
            <span className="account-switcher__item-role">{role ? spaceLabel(role) : ''}</span>
          </div>

          {accounts.map((account) => (
            <button
              key={account.userId}
              type="button"
              role="menuitem"
              className="account-switcher__item account-switcher__item--button"
              disabled={switchingTo !== null}
              onClick={() => void choose(account)}
            >
              <span className="account-switcher__item-school">{account.schoolName}</span>
              <span className="account-switcher__item-role">
                {switchingTo === account.userId ? 'Connexion…' : spaceLabel(account.role)}
              </span>
            </button>
          ))}

          <button
            type="button"
            role="menuitem"
            className="account-switcher__item account-switcher__item--link"
            onClick={() => {
              close();
              setLinking(true);
            }}
          >
            Lier un autre compte
          </button>
        </div>
      ) : null}

      <LinkAccountModal open={linking} onClose={() => setLinking(false)} />
    </div>
  );
}

/**
 * Preuve, par identifiant+mot de passe, qu'un second compte (identifiants
 * différents) appartient à la même personne — le cas que la bascule
 * automatique ne peut pas couvrir seule (ex. un enseignant qui est aussi
 * parent dans la même école).
 */
function LinkAccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { linkAccount } = useAuth();
  const toast = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setIdentifier('');
    setPassword('');
    setError(null);
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await linkAccount(identifier.trim(), password);
      toast.success('Compte lié — il apparaît désormais dans vos comptes.');
      reset();
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Lier un autre compte"
      subtitle="Utile si vous avez un autre compte Gesnotes (par exemple enseignant et parent) : ses identifiants prouvent qu'il s'agit bien de vous, une seule fois."
      footer={
        <ModalActions
          onCancel={() => {
            reset();
            onClose();
          }}
          onConfirm={() => void submit()}
          confirmLabel="Lier le compte"
          loading={submitting}
        />
      }
    >
      <form onSubmit={submit} className="page-stack" style={{ gap: 'var(--space-4)' }}>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <TextField
          label="Email ou téléphone de l'autre compte"
          name="identifier"
          autoComplete="off"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />

        <TextField
          label="Mot de passe de l'autre compte"
          name="password"
          type="password"
          autoComplete="off"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </form>
    </Modal>
  );
}
