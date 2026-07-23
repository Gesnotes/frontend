/// <reference lib="webworker" />

import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { createHandlerBoundToURL } from 'workbox-precaching';

import { firebaseConfig, isPushConfigured } from './push/firebaseConfig';

/**
 * Service worker unique de l'application.
 *
 * Il porte deux responsabilités qui ne peuvent pas vivre dans deux workers
 * séparés : une seule inscription peut contrôler une portée donnée, et le
 * second remplacerait le premier. On y trouve donc à la fois le cache hors
 * connexion et la réception des notifications FCM en arrière-plan.
 */

declare const self: ServiceWorkerGlobalScope;

// Injecté à la compilation par vite-plugin-pwa.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

/**
 * Navigation : coquille applicative servie depuis le cache.
 *
 * Sans cela, ouvrir l'application hors connexion afficherait la page d'erreur
 * du navigateur — or l'enseignant doit pouvoir saisir ses notes sans réseau.
 * Les requêtes d'API sont exclues : elles ne doivent jamais renvoyer le HTML.
 */
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api/, /\/[^/?]+\.[^/]+$/],
  }),
);

registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script',
  new StaleWhileRevalidate({ cacheName: 'gesnotes-assets' }),
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new StaleWhileRevalidate({ cacheName: 'gesnotes-fonts' }),
);

/**
 * Référentiels seulement (périodes, types de note) : ils changent une fois par
 * an et leur absence bloquerait tous les écrans.
 *
 * Les notes, elles, ne sont **jamais** mises en cache : afficher à un parent
 * une moyenne périmée comme si elle était à jour serait pire que ne rien
 * afficher.
 */
registerRoute(
  ({ url }) => url.pathname === '/terms' || url.pathname === '/grade-types',
  new NetworkFirst({ cacheName: 'gesnotes-referentiels', networkTimeoutSeconds: 5 }),
);

// Activation immédiate demandée par la page (bouton « Mettre à jour »).
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | undefined)?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

// ------------------------------------------------------------ Notifications

if (isPushConfigured) {
  /**
   * Initialiser Messaging **suffit** : c'est cet appel qui installe le
   * gestionnaire `push` du SDK.
   *
   * Volontairement pas de `onBackgroundMessage` ici. Le backend envoie une
   * charge `notification` (voir `notification.service.ts`), que le SDK affiche
   * lui-même. Y ajouter notre propre `showNotification` afficherait **deux**
   * notifications pour une seule note. La cible du clic est portée par
   * `webpush.fcmOptions.link`, côté serveur.
   *
   * Le repli ci-dessous ne traite donc que les messages sans charge
   * `notification`, qui n'existent pas aujourd'hui mais ne doivent pas
   * disparaître en silence si le backend en émet un jour.
   */
  const messaging = getMessaging(initializeApp(firebaseConfig));

  onBackgroundMessage(messaging, (payload) => {
    if (payload.notification) return;

    const data = (payload.data ?? {}) as Record<string, string>;
    if (!data.title) return;

    void self.registration.showNotification(data.title, {
      body: data.body ?? '',
      icon: '/icons/gesnotes.svg',
      badge: '/icons/gesnotes.svg',
      // Une notification par note : deux notes différentes ne doivent pas se
      // remplacer l'une l'autre dans le centre de notifications.
      tag: data.gradeId ? `grade-${data.gradeId}` : undefined,
      data: { url: data.gradeId ? `/parent/notes/${data.gradeId}` : '/parent' },
    });
  });
}

/** Clic sur une notification de repli : réutilise l'onglet déjà ouvert. */
self.addEventListener('notificationclick', (event) => {
  const target = (event.notification.data as { url?: string } | undefined)?.url;
  // Les notifications du SDK portent leur propre gestionnaire de clic.
  if (!target) return;

  event.notification.close();
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) {
        if ('focus' in client) {
          await client.focus();
          await client.navigate(new URL(target, self.location.origin).href);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
