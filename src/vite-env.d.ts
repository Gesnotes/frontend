/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Racine de l'API backend, ex. `http://localhost:3000`. */
  readonly VITE_API_BASE_URL?: string;
  /** Sous-domaine d'école envoyé en développement via `X-School-Subdomain`. */
  readonly VITE_SCHOOL_SUBDOMAIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
