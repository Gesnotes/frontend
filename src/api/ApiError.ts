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
      'Impossible de joindre le serveur. Vérifiez votre connexion.',
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

function defaultMessageFor(status: number): string {
  if (status === 401) return 'Session expirée, reconnectez-vous.';
  if (status === 403) return "Vous n'avez pas accès à cette ressource.";
  if (status === 404) return 'Ressource introuvable.';
  if (status === 429) return 'Trop de requêtes. Réessayez dans un instant.';
  if (status >= 500) {
    return "Une erreur inattendue est survenue de notre côté. Réessayez dans un instant ; si cela persiste, prévenez l'administration.";
  }
  return 'Une erreur est survenue.';
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Message affichable à l'utilisateur, quelle que soit la nature de l'erreur. */
export function errorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
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
