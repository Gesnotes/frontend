import { useState } from 'react';

import {
  errorMessage, staffApi, type ID, type SignupRequestRow, type SignupRequestStatus,
} from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { formatDateShort, plural } from '../../lib/format';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import {
  Button, Card, Chip, ConfirmDialog, EmptyState, Modal, ModalActions, Skeleton, TextField, useToast,
} from '../../ui';

export default function SignupRequestsPage() {
  const [status, setStatus] = useState<SignupRequestStatus>('nouveau');
  const requests = staffApi.useSignupRequests(status);
  const list = requests.data ?? [];

  const [accepting, setAccepting] = useState<SignupRequestRow | null>(null);
  const [declining, setDeclining] = useState<SignupRequestRow | null>(null);

  return (
    <>
      <PageHeader
        title="Demandes d'inscription"
        subtitle={
          requests.data
            ? `${list.length} ${plural(list.length, 'demande')} ${status === 'nouveau' ? 'en attente' : 'traitée' + (list.length > 1 ? 's' : '')}`
            : 'Formulaire public « Essayer Gesnotes »'
        }
        actions={
          <div className="choice-group">
            <button
              type="button"
              className={`choice${status === 'nouveau' ? ' on-good' : ''}`}
              onClick={() => setStatus('nouveau')}
            >
              En attente
            </button>
            <button
              type="button"
              className={`choice${status === 'traite' ? ' on-good' : ''}`}
              onClick={() => setStatus('traite')}
            >
              Traitées
            </button>
          </div>
        }
      />
      <PageContent>
        <QueryBoundary query={requests} loading={<ListSkeleton />}>
          {(items) =>
            items.length === 0 ? (
              <EmptyState
                icon="✎"
                title={status === 'nouveau' ? 'Aucune demande en attente' : 'Aucune demande traitée'}
                description={
                  status === 'nouveau'
                    ? 'Les demandes du formulaire public « Essayer Gesnotes » apparaîtront ici.'
                    : undefined
                }
              />
            ) : (
              <div className="page-stack" style={{ gap: 'var(--space-3)' }}>
                {items.map((request) => (
                  <Card key={request.id} padded>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 'var(--body-lg-size)' }}>{request.schoolName}</div>
                        <div className="list-row__meta">{request.city}</div>
                      </div>
                      <div className="t-label-sm t-subtle" style={{ textTransform: 'none' }}>
                        {formatDateShort(request.createdAt)}
                      </div>
                    </div>

                    <div style={{ marginTop: 'var(--space-3)', display: 'grid', gap: 'var(--space-1)' }}>
                      <div className="t-body-md">{request.contactName}</div>
                      <div className="t-body-md t-muted">{request.email} · {request.phone}</div>
                    </div>

                    {request.levels.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                        {request.levels.map((level) => (
                          <Chip key={level} tone="info">{level}</Chip>
                        ))}
                      </div>
                    ) : null}

                    {status === 'nouveau' ? (
                      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                        <Button onClick={() => setAccepting(request)}>Accepter</Button>
                        <Button variant="secondary" onClick={() => setDeclining(request)}>Refuser</Button>
                      </div>
                    ) : null}
                  </Card>
                ))}
              </div>
            )
          }
        </QueryBoundary>
      </PageContent>

      {accepting ? <AcceptModal request={accepting} onClose={() => setAccepting(null)} /> : null}
      {declining ? <DeclineDialog request={declining} onClose={() => setDeclining(null)} /> : null}
    </>
  );
}

/**
 * Nom, ville et sous-domaine sont préremplis depuis la demande, modifiables
 * avant de créer l'école pour de bon — le staff garde la main sur ce que le
 * formulaire public a saisi sans supervision.
 */
function AcceptModal({ request, onClose }: { request: SignupRequestRow; onClose: () => void }) {
  const toast = useToast();
  const accept = staffApi.useAcceptSignupRequest();

  const [schoolName, setSchoolName] = useState(request.schoolName);
  const [city, setCity] = useState(request.city);
  const [subdomain, setSubdomain] = useState('');

  async function onConfirm() {
    try {
      const result = await accept.mutateAsync({
        id: request.id,
        payload: {
          schoolName: schoolName.trim(),
          city: city.trim(),
          subdomain: subdomain.trim() || undefined,
        },
      });
      toast.success(`${result.school.name} créée (${result.school.subdomain}) — invitation envoyée à ${result.adminEmail}`);
      onClose();
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Accepter la demande"
      subtitle="Crée l'école et son premier compte administrateur, puis envoie l'invitation."
      footer={
        <ModalActions
          onCancel={onClose}
          onConfirm={() => void onConfirm()}
          confirmLabel="Créer l'école"
          danger={false}
          loading={accept.isPending}
        />
      }
    >
      <div className="page-stack" style={{ gap: 'var(--space-4)' }}>
        <TextField label="Nom de l'école" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
        <TextField label="Ville" value={city} onChange={(e) => setCity(e.target.value)} />
        <TextField
          label="Sous-domaine"
          hint="Laissez vide pour le déduire du nom de l'école."
          placeholder="ecole-la-colombe"
          value={subdomain}
          onChange={(e) => setSubdomain(e.target.value)}
        />
        <p className="t-body-md t-muted">
          Le premier compte administrateur sera <strong>{request.email}</strong>, invité à définir son mot
          de passe.
        </p>
      </div>
    </Modal>
  );
}

function DeclineDialog({ request, onClose }: { request: SignupRequestRow; onClose: () => void }) {
  const toast = useToast();
  const decline = staffApi.useDeclineSignupRequest();

  async function onConfirm() {
    try {
      await decline.mutateAsync(request.id as ID);
      toast.success('Demande écartée.');
      onClose();
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  return (
    <ConfirmDialog
      open
      title="Refuser la demande"
      description={`« ${request.schoolName} » sera marquée traitée, sans créer d'école. Cette action ne peut pas être annulée.`}
      confirmLabel="Refuser"
      danger
      loading={decline.isPending}
      onCancel={onClose}
      onConfirm={() => void onConfirm()}
    />
  );
}

function ListSkeleton() {
  return (
    <div className="page-stack" style={{ gap: 'var(--space-3)' }}>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} height={140} />
      ))}
    </div>
  );
}
