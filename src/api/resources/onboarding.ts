import { api } from '../http';
import type { MessageResponse, SignupRequestPayload } from '../types';

/** Avant qu'un compte existe : demander à le devenir. Route publique. */

/** `POST /signup-requests` — inscription hybride : capte la demande, rien d'autre. */
export function createSignupRequest(payload: SignupRequestPayload): Promise<MessageResponse> {
  return api.post<MessageResponse>('/signup-requests', payload);
}
