import { ApiError } from './ApiError';
import { API_BASE_URL } from './config';
import { staffSessionStore } from './staffSession';
import type { StaffLoginResult } from './types';

/**
 * Client HTTP de l'espace staff — doublon volontaire de `http.ts`.
 *
 * Ni `X-School-Subdomain` (les routes `/staff` sont hors périmètre
 * multi-écoles), ni `sessionStore` (jeton et rafraîchissement propres à ce
 * monde). Dupliquer ce fichier, plutôt que généraliser `http.ts` pour les
 * deux mondes à la fois, garde le client existant — déjà bien testé —
 * intact ; le pendant serveur fait le même choix (`staff-auth.service.ts`
 * distinct de `auth.service.ts`).
 */

export type Query = Record<string, string | number | boolean | undefined | null>;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Query;
  body?: unknown;
  /** Route publique : n'ajoute pas d'`Authorization` et ne tente pas de refresh. */
  anonymous?: boolean;
};

function buildStaffUrl(path: string, query?: Query): string {
  const full = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const url = new URL(full, window.location.origin);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function baseHeaders(anonymous: boolean): Headers {
  const headers = new Headers({ Accept: 'application/json' });
  if (!anonymous) {
    const token = staffSessionStore.getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

async function rawFetch(path: string, options: RequestOptions): Promise<Response> {
  const { method = 'GET', query, body, anonymous = false } = options;
  const headers = baseHeaders(anonymous);
  if (body !== undefined) headers.set('Content-Type', 'application/json');

  try {
    return await fetch(buildStaffUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    throw ApiError.network(cause);
  }
}

let refreshInFlight: Promise<boolean> | null = null;

function refreshStaffSession(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    const refreshToken = staffSessionStore.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await rawFetch('/staff/refresh', {
        method: 'POST',
        body: { refreshToken },
        anonymous: true,
      });
      if (!response.ok) {
        staffSessionStore.clear();
        return false;
      }
      staffSessionStore.set((await response.json()) as StaffLoginResult);
      return true;
    } catch {
      staffSessionStore.clear();
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

/** Requête JSON de l'espace staff. Sur 401, tente un refresh puis rejoue une seule fois. */
export async function staffApiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await rawFetch(path, options);

  if (response.status === 401 && !options.anonymous && staffSessionStore.getRefreshToken()) {
    const refreshed = await refreshStaffSession();
    if (refreshed) response = await rawFetch(path, options);
  }

  const body = await parseBody(response);

  if (!response.ok) {
    if (response.status === 401 && !options.anonymous) staffSessionStore.clear();
    throw ApiError.fromBody(response.status, body);
  }

  return body as T;
}
