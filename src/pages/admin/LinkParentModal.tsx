import { useState } from 'react';

import { errorMessage, studentsApi, type AttachParentPayload, type ID, type Student } from '../../api';
import { personName } from '../../lib/text';
import { emailError, phoneError } from '../../lib/validation';
import { Alert, Avatar, Button, Modal, TextField, useToast } from '../../ui';

/**
 * Association d'un parent : compte existant, ou création par invitation.
 *
 * Partagé entre `StudentsPage` (colonne d'actions) et `StudentDetailPage`
 * (fiche complète) — même logique, deux points d'entrée.
 */
export function LinkParentModal({ student, onClose }: { student: Student | null; onClose: () => void }) {
  const toast = useToast();
  const attach = studentsApi.useAttachParent();
  const detach = studentsApi.useDetachParent();
  const resend = studentsApi.useResendParentInvitation();

  const [search, setSearch] = useState('');
  const results = studentsApi.useParentSearch(search);

  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const inviteEmailMessage = emailError(inviteEmail, false);
  const invitePhoneMessage = phoneError(invitePhone);

  async function link(payload: AttachParentPayload) {
    if (!student) return;
    setError(null);
    try {
      await attach.mutateAsync({ id: student.id, payload });
      toast.success('Parent associé à l’élève');
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function unlink(parentId: ID) {
    if (!student) return;
    try {
      await detach.mutateAsync({ id: student.id, parentId });
      toast.success('Parent dissocié');
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function resendInvite(parentId: ID) {
    if (!student) return;
    setError(null);
    try {
      await resend.mutateAsync({ id: student.id, parentId });
      toast.success('Invitation renvoyée');
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <Modal
      open={student !== null}
      onClose={onClose}
      width={520}
      title="Parents de l'élève"
      subtitle={student ? `${student.firstName} ${student.lastName} · ${student.classe.name}` : undefined}
    >
      <div className="page-stack" style={{ gap: 'var(--space-5)' }}>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <section>
          <h3 className="t-label-sm t-muted">Parents associés</h3>
          {student && student.parents.length > 0 ? (
            <div className="list-rows">
              {student.parents.map((parent) => (
                <div key={parent.id} className="list-row">
                  <Avatar name={personName(parent)} size={32} />
                  <div className="list-row__body">
                    <div className="list-row__title">{personName(parent)}</div>
                    <div className="list-row__meta">
                      {[parent.phone, parent.email].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                  <div className="cell-actions">
                    <Button
                      size="sm"
                      variant="tonal"
                      loading={resend.isPending}
                      onClick={() => void resendInvite(parent.id)}
                    >
                      Renvoyer l'invitation
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={detach.isPending}
                      onClick={() => void unlink(parent.id)}
                    >
                      Dissocier
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="t-body-md t-muted" style={{ marginTop: 'var(--space-2)' }}>
              Aucun parent associé : personne ne reçoit les notes de cet élève.
            </p>
          )}
        </section>

        <section>
          <h3 className="t-label-sm t-muted" style={{ marginBottom: 'var(--space-2)' }}>
            Associer un compte existant
          </h3>
          <TextField
            label="Rechercher un parent"
            placeholder="Nom, email ou téléphone"
            hint="Au moins deux caractères."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {results.data && results.data.length > 0 ? (
            <div className="list-rows" style={{ marginTop: 'var(--space-3)' }}>
              {results.data.map((parent) => (
                <div key={parent.id} className="list-row">
                  <Avatar name={personName(parent)} size={32} />
                  <div className="list-row__body">
                    <div className="list-row__title">{personName(parent)}</div>
                    <div className="list-row__meta">
                      {[parent.phone, parent.email].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="tonal"
                    loading={attach.isPending}
                    onClick={() => void link({ parentUserId: parent.id })}
                  >
                    Associer
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          {results.data && results.data.length === 0 && search.trim().length >= 2 ? (
            <p className="t-body-md t-muted" style={{ marginTop: 'var(--space-2)' }}>
              Aucun compte trouvé. Créez-en un ci-dessous.
            </p>
          ) : null}
        </section>

        <section>
          <h3 className="t-label-sm t-muted" style={{ marginBottom: 'var(--space-2)' }}>
            Ou inviter un nouveau parent
          </h3>
          <div className="page-stack" style={{ gap: 'var(--space-3)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <TextField
                label="Prénom"
                value={inviteFirstName}
                onChange={(e) => setInviteFirstName(e.target.value)}
              />
              <TextField
                label="Nom"
                value={inviteLastName}
                onChange={(e) => setInviteLastName(e.target.value)}
              />
            </div>
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              hint="Le parent recevra un lien pour définir son mot de passe."
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              // Une adresse fausse crée un compte que l'invitation n'atteint
              // jamais : le parent reste sans mot de passe, sans que rien ne
              // le signale.
              error={inviteEmailMessage}
            />
            <TextField
              label="Téléphone"
              type="tel"
              autoComplete="tel"
              hint="Facultatif — utile à l'école pour joindre le parent directement."
              value={invitePhone}
              onChange={(e) => setInvitePhone(e.target.value)}
              error={invitePhoneMessage}
            />
            <Button
              variant="secondary"
              disabled={!inviteEmail.trim() || inviteEmailMessage !== undefined || invitePhoneMessage !== undefined}
              loading={attach.isPending}
              onClick={() =>
                void link({
                  email: inviteEmail.trim(),
                  phone: invitePhone.trim() || undefined,
                  firstName: inviteFirstName.trim() || undefined,
                  lastName: inviteLastName.trim() || undefined,
                })
              }
            >
              Créer et associer
            </Button>
          </div>
        </section>
      </div>
    </Modal>
  );
}
