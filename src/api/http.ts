import { ApiError } from './ApiError';
import { API_BASE_URL, SCHOOL_SUBDOMAIN } from './config';
import { sessionStore } from './session';
import type { LoginResult } from './types';

/** Valeurs acceptées dans une query string ; `undefined` et `null` sont ignorés. */
export type QueryValue = string | number | boolean | undefined | null;
export type Query = Record<string, QueryValue>;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Query;
  body?: unknown;
  /** Route publique : n'ajoute pas d'`Authorization` et ne tente pas de refresh. */
  anonymous?: boolean;
  signal?: AbortSignal;
};

export function buildUrl(path: string, query?: Query): string {
  const full = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  // `API_BASE_URL` vaut `/api` par défaut : une base relative n'est pas une
  // URL valide pour `new URL`, il lui faut l'origine de la page.
  const url = new URL(full, window.location.origin);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function baseHeaders(anonymous: boolean): Headers {
  const headers = new Headers({ Accept: 'application/json' });
  if (SCHOOL_SUBDOMAIN) headers.set('X-School-Subdomain', SCHOOL_SUBDOMAIN);
  if (!anonymous) {
    const token = sessionStore.getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

async function rawFetch(path: string, options: RequestOptions): Promise<Response> {
  const { method = 'GET', query, body, anonymous = false, signal } = options;
  const headers = baseHeaders(anonymous);
  if (body !== undefined) headers.set('Content-Type', 'application/json');

  try {
    return await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw ApiError.network(cause);
  }
}

/**
 * Rafraîchissement du token, mutualisé.
 *
 * Plusieurs requêtes peuvent recevoir un 401 en même temps ; le backend
 * révoque toute la famille de refresh tokens si le même est rejoué, donc une
 * seule tentative doit être en vol à la fois.
 */
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    const refreshToken = sessionStore.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await rawFetch('/auth/refresh', {
        method: 'POST',
        body: { refreshToken },
        anonymous: true,
      });
      if (!response.ok) {
        sessionStore.clear();
        return false;
      }
      sessionStore.set((await response.json()) as LoginResult);
      return true;
    } catch {
      sessionStore.clear();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.headers.get('Content-Length') === '0') return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Requête JSON authentifiée.
 *
 * Sur 401, tente un refresh puis rejoue **une seule fois** ; si le refresh
 * échoue, la session est purgée et l'erreur remonte pour que l'UI redirige
 * vers la page de connexion.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await rawFetch(path, options);

  if (response.status === 401 && !options.anonymous && sessionStore.getRefreshToken()) {
    const refreshed = await refreshSession();
    if (refreshed) response = await rawFetch(path, options);
  }

  const body = await parseBody(response);

  if (!response.ok) {
    if (response.status === 401 && !options.anonymous) sessionStore.clear();
    throw ApiError.fromBody(response.status, body);
  }

  return body as T;
}

/** Téléchargement binaire (export PDF des bulletins). */
export async function apiFetchBlob(path: string, query?: Query): Promise<Blob> {
  let response = await rawFetch(path, { query });

  if (response.status === 401 && sessionStore.getRefreshToken()) {
    const refreshed = await refreshSession();
    if (refreshed) response = await rawFetch(path, { query });
  }

  if (!response.ok) {
    if (response.status === 401) sessionStore.clear();
    throw ApiError.fromBody(response.status, await parseBody(response));
  }

  return response.blob();
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    apiFetch<T>(path, { method: 'GET', query, signal }),
  post: <T>(path: string, body?: unknown, query?: Query) =>
    apiFetch<T>(path, { method: 'POST', body, query }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string, query?: Query) => apiFetch<T>(path, { method: 'DELETE', query }),
  /** Requête sur une route publique (login, refresh, mot de passe oublié). */
  anonymous: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body, anonymous: true }),
};
