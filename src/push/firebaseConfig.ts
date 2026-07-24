/**
 * Configuration Firebase côté navigateur.
 *
 * Ces valeurs sont **publiques** : elles identifient le projet, elles
 * n'autorisent rien. L'envoi d'une notification exige la clé privée du compte
 * de service, qui reste côté backend (`FIREBASE_PRIVATE_KEY`). Les exposer
 * dans le bundle est le fonctionnement normal de Firebase Web.
 *
 * Où les trouver — voir `docs/PWA-PUSH.md` :
 *   Console Firebase → Paramètres du projet → Général → Vos applications → Web
 *   Console Firebase → Paramètres du projet → Cloud Messaging → Certificats
 *   Web Push  (c'est la « clé publique » de la paire, alias clé VAPID)
 */

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
};

/** Clé publique du certificat Web Push (VAPID). */
export const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '';

/**
 * Le push n'est tenté que si la configuration est complète.
 *
 * Sans ce garde, `initializeApp` lèverait au démarrage du service worker et
 * emporterait avec lui le cache hors connexion — l'application deviendrait
 * inutilisable sans réseau parce que les notifications ne sont pas configurées.
 */
export const isPushConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId,
);
