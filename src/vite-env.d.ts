/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite-plugin-pwa/info" />

interface ImportMetaEnv {
  /** Racine de l'API backend, ex. `http://localhost:3000`. */
  readonly VITE_API_BASE_URL?: string;
  /** Sous-domaine d'école envoyé en développement via `X-School-Subdomain`. */
  readonly VITE_SCHOOL_SUBDOMAIN?: string;

  /**
   * Configuration web Firebase — Console → Paramètres du projet → Général →
   * Vos applications → Application Web. Valeurs publiques : elles identifient
   * le projet et n'autorisent aucun envoi.
   */
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;

  /**
   * Clé publique du certificat Web Push (VAPID) — Console → Paramètres du
   * projet → Cloud Messaging → Certificats Web Push.
   */
  readonly VITE_FIREBASE_VAPID_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
