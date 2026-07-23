import { initializeApp, type FirebaseApp } from 'firebase/app';
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';

import { registerDevice, removeDevice } from '../api/resources/parent';
import { firebaseConfig, isPushConfigured, vapidKey } from './firebaseConfig';

/**
 * Notifications push côté navigateur.
 *
 * Le jeton FCM identifie **cet appareil-ci**, pas l'utilisateur : il doit être
 * enregistré auprès du backend après chaque connexion, et retiré à la
 * déconnexion, faute de quoi un parent continuerait de recevoir les notes de
 * ses enfants sur le téléphone d'un proche à qui il a prêté l'appareil.
 */

export type PushState =
  | 'non-configure'
  | 'non-supporte'
  | 'refuse'
  | 'inactif'
  | 'actif';

let app: FirebaseApp | null = null;

function firebaseApp(): FirebaseApp {
  app ??= initializeApp(firebaseConfig);
  return app;
}

/** Le stockage local retient le jeton pour pouvoir le retirer à la déconnexion. */
const TOKEN_KEY = 'gesnotes.fcm-token';

function storedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Mode privé : le jeton vaudra pour la session en cours seulement.
  }
}

export async function pushState(): Promise<PushState> {
  if (!isPushConfigured || !vapidKey) return 'non-configure';
  if (!(await isSupported())) return 'non-supporte';
  if (Notification.permission === 'denied') return 'refuse';
  return storedToken() ? 'actif' : 'inactif';
}

/**
 * Demande l'autorisation, obtient un jeton et l'enregistre côté serveur.
 *
 * L'inscription du service worker est passée explicitement : sans elle,
 * Firebase en créerait une seconde sur `/firebase-messaging-sw.js`, qui
 * écraserait celle qui porte le cache hors connexion.
 */
export async function enablePush(): Promise<PushState> {
  const state = await pushState();
  if (state === 'non-configure' || state === 'non-supporte' || state === 'refuse') return state;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'refuse' : 'inactif';

  const registration = await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(firebaseApp()), {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!token) return 'inactif';

  await registerDevice(token);
  storeToken(token);
  return 'actif';
}

/** Retire l'appareil : côté serveur d'abord, puis côté Firebase. */
export async function disablePush(): Promise<PushState> {
  const token = storedToken();
  if (!token) return 'inactif';

  try {
    await removeDevice(token);
  } catch {
    // L'appareil a pu être retiré ailleurs (autre onglet, écran Alertes) :
    // ce n'est pas une raison pour garder un jeton actif dans ce navigateur.
  }

  try {
    await deleteToken(getMessaging(firebaseApp()));
  } catch {
    // Jeton déjà invalidé côté Firebase.
  }

  storeToken(null);
  return 'inactif';
}

/**
 * Message reçu **application ouverte**.
 *
 * FCM ne montre alors aucune notification système : c'est à l'application
 * d'avertir, sinon un parent en train de consulter l'écran d'accueil ne verrait
 * jamais passer la note qui vient d'arriver.
 */
export async function onForegroundMessage(
  handler: (message: { title: string; body: string; gradeId?: string }) => void,
): Promise<() => void> {
  if (!isPushConfigured || !(await isSupported())) return () => {};

  return onMessage(getMessaging(firebaseApp()), (payload) => {
    const data = (payload.data ?? {}) as Record<string, string>;
    handler({
      title: data.title ?? payload.notification?.title ?? 'Gesnotes',
      body: data.body ?? payload.notification?.body ?? '',
      gradeId: data.gradeId,
    });
  });
}
