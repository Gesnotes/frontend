import { errorMessage, parentApi, type Device } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useAuth } from '../../auth/auth-context';
import { formatDate } from '../../lib/format';
import { Alert, Button, Card, EmptyState, Skeleton, useToast } from '../../ui';

/**
 * Appareils recevant les notifications push.
 *
 * L'enregistrement d'un nouvel appareil réclame un jeton FCM, donc la
 * configuration web Firebase et un service worker ; tant qu'ils ne sont pas
 * fournis, cet écran gère ce qui est possible sans eux : lister les appareils
 * déjà enregistrés et en retirer un (téléphone perdu ou remplacé).
 */
export default function NotificationsPage() {
  const toast = useToast();
  const { logout } = useAuth();
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
          <p className="parent__greeting">Appareils recevant les notifications</p>
        </div>
      </header>

      <Alert tone="info">
        Vous recevez une notification à chaque nouvelle note. Retirez un appareil que vous
        n'utilisez plus pour cesser d'y être alerté.
      </Alert>

      <QueryBoundary query={devices} loading={<Skeleton height={140} radius="var(--radius-lg)" />}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState
              icon="◔"
              title="Aucun appareil enregistré"
              description="Aucun téléphone ne reçoit vos notifications pour le moment. Consultez cet espace régulièrement pour suivre les nouvelles notes."
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

      <Button variant="secondary" block onClick={() => void logout()}>
        Se déconnecter
      </Button>
    </main>
  );
}
