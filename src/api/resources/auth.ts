import { api } from '../http';
import { sessionStore } from '../session';
import type { AuthContextPayload, IdentifyResult, MessageResponse } from '../types';

/**
 * `POST /auth/identify` — seule porte de connexion : aucune école n'est
 * résolue au préalable, l'identifiant est cherché à travers toutes les écoles
 * actives.
 *
 * Un seul compte correspond : la session s'ouvre directement. Plusieurs
 * comptes correspondent (même email/téléphone + mot de passe dans deux
 * écoles) : aucune session n'est ouverte, l'appelant doit faire choisir
 * l'école puis rappeler avec son `schoolId` pour trancher.
 */
export async function identify(
  identifier: string,
  password: string,
  schoolId?: number,
): Promise<IdentifyResult> {
  const result = await api.anonymous<IdentifyResult>('/auth/identify', { identifier, password, schoolId });
  if (result.status === 'ok') sessionStore.set(result);
  return result;
}

/**
 * `POST /auth/logout` — révoque le refresh token et coupe les access tokens
 * déjà émis. La session locale est purgée même si l'appel échoue : côté
 * client, l'utilisateur doit être déconnecté quoi qu'il arrive.
 */
export async function logout(): Promise<void> {
  const refreshToken = sessionStore.getRefreshToken();
  try {
    if (refreshToken) await api.post('/auth/logout', { refreshToken });
  } finally {
    sessionStore.clear();
  }
}

/**
 * `POST /auth/forgot-password`.
 *
 * La réponse est identique que le compte existe ou non (anti-énumération) :
 * l'UI ne doit donc jamais annoncer « compte inconnu ».
 */
export function forgotPassword(email: string): Promise<MessageResponse> {
  return api.anonymous<MessageResponse>('/auth/forgot-password', { email });
}

/** `POST /auth/reset-password` — le token vient du lien reçu par email. */
export function resetPassword(token: string, password: string): Promise<MessageResponse> {
  return api.anonymous<MessageResponse>('/auth/reset-password', { token, password });
}

/** `GET /me` — contexte de session (identifiant, école, rôle), sans identité. */
export function fetchMe(): Promise<AuthContextPayload> {
  return api.get<AuthContextPayload>('/me');
}
