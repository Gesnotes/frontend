import { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  Megaphone,
  ShieldAlert,
  Smartphone,
} from 'lucide-react';

import { errorMessage, notificationsApi, parentApi, type Device, type NotificationItem } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useAuth } from '../../auth/auth-context';
import { formatDate, formatRelative } from '../../lib/format';
import { usePush } from '../../push/usePush';
import { InstallCard } from '../../pwa/InstallCard';
import { Alert, Button, Card, Chip, EmptyState, Skeleton, useToast } from '../../ui';

type Tab = 'toutes' | 'non_lues' | 'appareils';

export default function NotificationsPage() {
  const toast = useToast();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('toutes');

  const push = usePush();
  const devices = parentApi.useDevices();
  const remove = parentApi.useRemoveDevice();

  const notificationsQuery = notificationsApi.useNotifications(activeTab === 'non_lues');
  const markRead = notificationsApi.useMarkNotificationRead();
  const markAllRead = notificationsApi.useMarkAllNotificationsRead();

  async function handleMarkAsRead(item: NotificationItem) {
    if (item.readAt) return;
    try {
      await markRead.mutateAsync(item.id);
      toast.success('Notification marquée comme lue');
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  async function handleMarkAllAsRead() {
    try {
      const res = await markAllRead.mutateAsync();
      toast.success(`${res.count} notification(s) marquée(s) comme lue(s)`);
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  async function unregister(device: Device) {
    try {
      await remove.mutateAsync(device.fcmToken);
      toast.success('Appareil retiré');
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const items = notificationsQuery.data?.items ?? [];

  return (
    <main className="parent__body">
      <header className="parent__topbar">
        <div>
          <h1 className="parent__name">Annonces & Alertes</h1>
          <p className="parent__greeting">Communications de l'établissement</p>
        </div>
      </header>

      <InstallCard />

      {/* Barre d'onglets */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-4)',
          overflowX: 'auto',
          paddingBottom: 'var(--space-1)',
        }}
      >
        <Button
          size="sm"
          variant={activeTab === 'toutes' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('toutes')}
        >
          <Bell size={16} style={{ marginRight: '6px' }} />
          Toutes
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'non_lues' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('non_lues')}
        >
          Non lues
          {unreadCount > 0 ? (
            <span
              style={{
                marginLeft: '6px',
                background: 'var(--color-danger, #ef4444)',
                color: '#fff',
                borderRadius: '999px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 'bold',
              }}
            >
              {unreadCount}
            </span>
          ) : null}
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'appareils' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('appareils')}
        >
          <Smartphone size={16} style={{ marginRight: '6px' }} />
          Appareils & Push
        </Button>
      </div>

      {activeTab === 'appareils' ? (
        <>
          <PushControl push={push} onDevicesChanged={() => void devices.refetch()} />
          <section style={{ marginTop: 'var(--space-4)' }}>
            <h2 className="parent__section-title" style={{ marginBottom: 'var(--space-3)' }}>
              Appareils enregistrés
            </h2>
            <QueryBoundary query={devices} loading={<Skeleton height={120} radius="var(--radius-lg)" />}>
              {(deviceList) =>
                deviceList.length === 0 ? (
                  <EmptyState
                    icon={<Bell size={28} />}
                    title="Aucun appareil"
                    description="Activez les notifications ci-dessus pour être prévenu en temps réel."
                  />
                ) : (
                  <div className="parent__cards">
                    {deviceList.map((device) => (
                      <Card key={device.id} padded>
                        <div className="parent__row" style={{ padding: 0 }}>
                          <span className="parent__row-body">
                            <span className="parent__row-title">Appareil #{device.id}</span>
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
        </>
      ) : (
        <section>
          {unreadCount > 0 && activeTab === 'toutes' ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-3)' }}>
              <Button
                size="sm"
                variant="secondary"
                loading={markAllRead.isPending}
                onClick={() => void handleMarkAllAsRead()}
              >
                <CheckCheck size={16} style={{ marginRight: '6px' }} />
                Tout marquer comme lu
              </Button>
            </div>
          ) : null}

          <QueryBoundary query={notificationsQuery} loading={<Skeleton height={200} radius="var(--radius-lg)" />}>
            {() =>
              items.length === 0 ? (
                <EmptyState
                  icon={<Bell size={32} />}
                  title={activeTab === 'non_lues' ? 'Aucune alerte non lue' : 'Aucune annonce'}
                  description="Vous êtes à jour. Les annonces et incidents de l'école apparaîtront ici."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {items.map((item) => (
                    <NotificationCard
                      key={item.recipientId}
                      item={item}
                      onMarkAsRead={() => void handleMarkAsRead(item)}
                      isMarking={markRead.isPending}
                    />
                  ))}
                </div>
              )
            }
          </QueryBoundary>
        </section>
      )}

      <div style={{ marginTop: 'var(--space-6)' }}>
        <Button variant="secondary" block onClick={() => void logout()}>
          Se déconnecter
        </Button>
      </div>
    </main>
  );
}

function NotificationCard({
  item,
  onMarkAsRead,
  isMarking,
}: {
  item: NotificationItem;
  onMarkAsRead: () => void;
  isMarking: boolean;
}) {
  const isUnread = !item.readAt;

  // Type visual configurations
  const typeConfig = {
    incident: {
      icon: <ShieldAlert size={20} style={{ color: '#ef4444' }} />,
      badgeTone: 'danger' as const,
      badgeLabel: '🚨 Incident Grave',
      borderColor: '#ef4444',
      bgLight: 'rgba(239, 68, 68, 0.05)',
    },
    convocation: {
      icon: <AlertTriangle size={20} style={{ color: '#f59e0b' }} />,
      badgeTone: 'warning' as const,
      badgeLabel: '⚠️ Convocation',
      borderColor: '#f59e0b',
      bgLight: 'rgba(245, 158, 11, 0.05)',
    },
    annonce: {
      icon: <Megaphone size={20} style={{ color: '#3b82f6' }} />,
      badgeTone: 'info' as const,
      badgeLabel: '📢 Annonce',
      borderColor: '#3b82f6',
      bgLight: 'rgba(59, 130, 246, 0.05)',
    },
  }[item.type];

  return (
    <Card
      padded
      style={{
        borderLeft: `4px solid ${typeConfig.borderColor}`,
        backgroundColor: isUnread ? typeConfig.bgLight : undefined,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {typeConfig.icon}
          <Chip tone={typeConfig.badgeTone}>{typeConfig.badgeLabel}</Chip>
          {isUnread ? (
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary, #2563eb)',
                display: 'inline-block',
              }}
              title="Non lu"
            />
          ) : null}
        </div>
        <span style={{ fontSize: 'var(--font-size-xs, 12px)', color: 'var(--color-text-muted, #6b7280)' }}>
          {formatRelative(item.createdAt)}
        </span>
      </div>

      <h3 style={{ marginTop: 'var(--space-2)', marginBottom: 'var(--space-1)', fontSize: '1.05rem', fontWeight: 600 }}>
        {item.title}
      </h3>

      <p style={{ color: 'var(--color-text-body, #374151)', whiteSpace: 'pre-line', lineHeight: 1.5, margin: 'var(--space-2) 0' }}>
        {item.body}
      </p>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 'var(--space-3)',
          paddingTop: 'var(--space-2)',
          borderTop: '1px solid var(--color-border-subtle, #f3f4f6)',
          fontSize: 'var(--font-size-xs, 12px)',
          color: 'var(--color-text-muted, #6b7280)',
        }}
      >
        <span>
          De : <strong>{item.creatorName}</strong> ({item.creatorRole === 'admin' ? 'Administration' : 'Enseignant'})
        </span>

        {isUnread ? (
          <Button size="sm" variant="ghost" loading={isMarking} onClick={onMarkAsRead}>
            Marquer comme lu
          </Button>
        ) : (
          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCheck size={14} /> Lu
          </span>
        )}
      </div>
    </Card>
  );
}

function PushControl({
  push,
  onDevicesChanged,
}: {
  push: ReturnType<typeof usePush>;
  onDevicesChanged: () => void;
}) {
  const { state, busy, error, enable, disable } = push;

  if (state === 'non-configure') {
    return (
      <Alert tone="info">
        Les notifications push ne sont pas configurées sur ce serveur. Vous pouvez toujours consulter vos alertes ci-dessus.
      </Alert>
    );
  }

  if (state === 'non-supporte') {
    return (
      <Alert tone="info">
        Ce navigateur ne gère pas les notifications push. Sur iPhone, ajoutez Gesnotes à l'écran d'accueil Safari.
      </Alert>
    );
  }

  if (state === 'refuse') {
    return (
      <Alert tone="danger">
        Les notifications push sont bloquées dans votre navigateur. Réautorisez-les dans les réglages du site.
      </Alert>
    );
  }

  return (
    <Card padded>
      <p className="parent__row-title">
        {state === 'actif' ? 'Notifications push activées' : 'Activer les notifications push'}
      </p>
      <p className="t-body-md t-muted" style={{ marginTop: 'var(--space-2)' }}>
        {state === 'actif'
          ? 'Vous êtes prévenu instantanément sur cet appareil lors des annonces et incidents.'
          : 'Recevez des alertes instantanées sur votre écran de verrouillage.'}
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
        {state === 'actif' ? 'Désactiver sur cet appareil' : 'Activer les notifications push'}
      </Button>
    </Card>
  );
}
