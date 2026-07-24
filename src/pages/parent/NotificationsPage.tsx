import { errorMessage, parentApi, type Device } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useAuth } from '../../auth/auth-context';
import { formatDate } from '../../lib/format';
import { usePush } from '../../push/usePush';
import { InstallCard } from '../../pwa/InstallCard';
import { Alert, Button, Card, EmptyState, Skeleton, useToast } from '../../ui';

/**
 * Notifications de l'appareil.
 *
 * Le jeton FCM identifie **ce navigateur**, pas le compte : activer sur le
 * téléphone n'active pas sur l'ordinateur, et la liste ci-dessous permet de
 * retirer un appareil qu'on n'a plus.
 */
export default function NotificationsPage() {
  const toast = useToast();
  const { logout } = useAuth();

  const push = usePush();
  const devices = parentApi.useDevices();
  const remove = parentApi.useRemoveDevice();

  async function unregister(device: Device) {
    try {
      await remove.mutateAsync(device.fcmToken);
      toast.success('Appareil retiré');
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  return (
    <main className="parent__body">
      <header className="parent__topbar">
        <div>
          <p className="parent__name">Alertes</p>
          <p className="parent__greeting">Notifications de nouvelles notes</p>
        </div>
      </header>

      <InstallCard />

      <PushControl push={push} onDevicesChanged={() => void devices.refetch()} />

      <section>
        <h2 className="parent__section-title" style={{ marginBottom: 'var(--space-3)' }}>
          Appareils enregistrés
        </h2>

        <QueryBoundary query={devices} loading={<Skeleton height={120} radius="var(--radius-lg)" />}>
          {(items) =>
            items.length === 0 ? (
              <EmptyState
                icon="◔"
                title="Aucun appareil"
                description="Activez les notifications ci-dessus pour être prévenu dès qu'une note est saisie."
              />
            ) : (
              <div className="parent__cards">
                {items.map((device) => (
                  <Card key={device.id} padded>
                    <div className="parent__row" style={{ padding: 0 }}>
                      <span className="parent__row-body">
                        <span className="parent__row-title">Appareil {device.id}</span>
                        <span className="parent__row-meta">
                          Enregistré le {formatDate(device.createdAt)}
                        </span>
                      </span>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={remove.isPending}
                        onClick={() => void unregister(device)}
                      >
                        Retirer
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )
          }
        </QueryBoundary>
      </section>

      <Button variant="secondary" block onClick={() => void logout()}>
        Se déconnecter
      </Button>
    </main>
  );
}

function PushControl({
  push, onDevicesChanged,
}: { push: ReturnType<typeof usePush>; onDevicesChanged: () => void }) {
  const { state, busy, error, enable, disable } = push;

  if (state === 'non-configure') {
    return (
      <Alert tone="info">
        Les notifications ne sont pas configurées sur cette installation. Consultez cet espace
        régulièrement pour suivre les nouvelles notes.
      </Alert>
    );
  }

  if (state === 'non-supporte') {
    return (
      <Alert tone="info">
        Ce navigateur ne gère pas les notifications. Sur iPhone, ajoutez d'abord Gesnotes à
        l'écran d'accueil depuis Safari.
      </Alert>
    );
  }

  if (state === 'refuse') {
    return (
      <Alert tone="danger">
        Les notifications sont bloquées pour ce site. Réautorisez-les dans les réglages de votre
        navigateur, puis revenez sur cette page.
      </Alert>
    );
  }

  return (
    <Card padded>
      <p className="parent__row-title">
        {state === 'actif' ? 'Notifications activées' : 'Activer les notifications'}
      </p>
      <p className="t-body-md t-muted" style={{ marginTop: 'var(--space-2)' }}>
        {state === 'actif'
          ? 'Vous êtes prévenu sur cet appareil dès qu’un enseignant saisit une note.'
          : 'Recevez une alerte dès qu’une note est saisie, sans avoir à ouvrir l’application.'}
      </p>

      {error ? (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}

      <Button
        block
        style={{ marginTop: 'var(--space-4)' }}
        variant={state === 'actif' ? 'secondary' : 'primary'}
        loading={busy}
        onClick={async () => {
          if (state === 'actif') await disable();
          else await enable();
          onDevicesChanged();
        }}
      >
        {state === 'actif' ? 'Désactiver sur cet appareil' : 'Activer les notifications'}
      </Button>
    </Card>
  );
}
