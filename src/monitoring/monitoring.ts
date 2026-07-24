import * as Sentry from '@sentry/react';

/**
 * Suivi des erreurs, via le SDK Sentry pointé sur GlitchTip.
 *
 * GlitchTip parle le protocole Sentry : le SDK officiel fonctionne tel quel,
 * seul le DSN change. Rien n'est envoyé tant que `VITE_SENTRY_DSN` est vide,
 * ce qui est le cas par défaut.
 *
 * Marche à suivre complète : `../../backend/docs/MONITORING.md`.
 */

const dsn = import.meta.env.VITE_SENTRY_DSN ?? '';

export const isMonitoringEnabled = Boolean(dsn);

export function initMonitoring(): void {
  if (!isMonitoringEnabled) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,

    /**
     * Aucune donnée personnelle.
     *
     * Ce produit affiche les notes d'élèves mineurs : `sendDefaultPii`
     * enverrait adresse IP et contenu des requêtes au serveur de supervision.
     * On garde la trace technique, jamais le contenu.
     */
    sendDefaultPii: false,

    // Pas de replay de session ni de traçage : GlitchTip stocke chaque
    // événement, et un petit établissement n'a rien à y gagner.
    integrations: [],
    tracesSampleRate: 0,

    /**
     * Le bruit qui n'apprend rien est filtré à la source.
     *
     * Une coupure réseau ou une extension de navigateur produit des erreurs
     * par dizaines sans qu'aucun correctif soit possible : les laisser passer
     * enterrerait les vraies régressions.
     */
    ignoreErrors: [
      // Réseau coupé : déjà traité par l'application (bandeau hors connexion,
      // file d'attente des saisies).
      'Failed to fetch',
      'NetworkError',
      'Load failed',
      'Impossible de joindre le serveur',
      // Navigation pendant une requête, sans conséquence.
      'AbortError',
      // Extensions de navigateur, hors de notre code.
      'ResizeObserver loop',
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
    ],

    beforeSend(event) {
      // Ceinture et bretelles : ni cookies, ni corps de requête.
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        delete event.request.headers;
      }
      return event;
    },
  });
}

/**
 * Attache l'utilisateur connecté.
 *
 * Identifiant et rôle seulement : de quoi reproduire un incident sans
 * transporter le nom ni l'email de qui que ce soit.
 */
export function setMonitoringUser(user: { id: number; role: string } | null): void {
  if (!isMonitoringEnabled) return;
  if (!user) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({ id: String(user.id) });
  Sentry.setTag('role', user.role);
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!isMonitoringEnabled) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

/**
 * Déclencheur d'erreur de test, exposé sur `window` en développement.
 *
 * Vérifier le câblage depuis la console du navigateur évite d'avoir à casser
 * un écran pour s'assurer que les événements arrivent bien.
 *
 *   window.__gesnotesTestError()
 */
if (import.meta.env.DEV) {
  (window as unknown as { __gesnotesTestError?: () => void }).__gesnotesTestError = () => {
    const error = new Error('Erreur de test Gesnotes — la supervision fonctionne');
    captureException(error, { source: 'test-manuel' });
    // Relancée pour être visible dans la console même sans DSN configuré.
    throw error;
  };
}

export { Sentry };
