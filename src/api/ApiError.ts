import type { ApiErrorBody } from './types';

/**
 * Erreur remontée par l'API, au format unique du backend :
 * `{ error: { code, message, details? } }`.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Erreur réseau : requête jamais parvenue au serveur. */
  static network(cause: unknown): ApiError {
    const error = new ApiError(
      0,
      'NETWORK_ERROR',
      'Connexion impossible. Vérifiez votre réseau ou vos données mobiles, puis réessayez.',
      cause,
    );
    return error;
  }

  static fromBody(status: number, body: unknown): ApiError {
    const parsed = body as Partial<ApiErrorBody> | null;
    const error = parsed?.error;
    if (error && typeof error.message === 'string') {
      return new ApiError(status, error.code ?? 'UNKNOWN', error.message, error.details);
    }
    return new ApiError(status, 'UNKNOWN', defaultMessageFor(status));
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isNotFound() {
    return this.status === 404;
  }

  get isConflict() {
    return this.status === 409;
  }

  /** Erreur passagère : vaut la peine d'être réessayée. */
  get isRetryable() {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
}

/**
 * Message de repli, quand le serveur n'en fournit aucun d'exploitable.
 *
 * Écrit pour une secrétaire ou un parent, pas pour un développeur : chaque
 * phrase dit ce qui se passe **et** quoi faire. « Ressource introuvable » ne
 * remplit ni l'un ni l'autre.
 */
function defaultMessageFor(status: number): string {
  if (status === 401) return 'Votre session a expiré. Reconnectez-vous pour continuer.';
  if (status === 403) return "Vous n'avez pas accès à cette page.";
  if (status === 404) return "Cet élément n'existe pas, ou il a été supprimé entre-temps.";
  if (status === 429) return 'Vous allez trop vite pour nous. Patientez un instant, puis réessayez.';
  if (status >= 500) {
    return "Le problème vient de nous, pas de vous. Réessayez dans un instant ; si cela continue, prévenez l'administration.";
  }
  return "L'opération n'a pas pu être effectuée.";
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Message affichable à l'utilisateur, quelle que soit la nature de l'erreur. */
export function errorMessage(
  error: unknown,
  fallback = "L'opération n'a pas pu être effectuée.",
): string {
  if (isApiError(error)) {
    // Une 5xx ne porte jamais de message actionnable (« Erreur interne ») : on
    // affiche un texte qui dit à l'utilisateur quoi faire, pas le jargon serveur.
    // Les 4xx, elles, portent le vrai motif métier (« Vous n'enseignez pas… »).
    if (error.status >= 500) return defaultMessageFor(error.status);
    return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
