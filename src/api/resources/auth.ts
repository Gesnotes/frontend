import { api } from '../http';
import { sessionStore, type StoredAccount } from '../session';
import type { AuthContextPayload, IdentifyResult, LoginResult, MessageResponse, OtherAccount } from '../types';

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
  if (result.status === 'ok') sessionStore.setFromIdentify(result);
  return result;
}

/**
 * Bascule vers un autre compte déjà connu (`sessionStore`'s `accounts`),
 * sans repasser par `/auth/identify` : le `refreshToken` stocké pour ce
 * compte a déjà prouvé l'identité au moment de la connexion (ou de la
 * liaison) qui l'a produit.
 *
 * Identifié par `userId`, jamais par `schoolId` : un compte lié
 * explicitement (`linkAccount`) peut partager la même école que le compte
 * actif (ex. enseignant + parent dans le même établissement) — `schoolId`
 * seul ne distingue pas deux comptes dans ce cas, `userId` si.
 *
 * Le compte qu'on quitte est rangé dans `accounts` avec son propre dernier
 * `refreshToken` connu — jamais celui qu'on vient de consommer pour le
 * compte cible, jamais réutilisé une fois la rotation faite.
 */
export async function switchAccount(userId: number): Promise<void> {
  const current = sessionStore.get();
  if (!current) throw new Error('Aucune session active');

  const target = current.accounts.find((account) => account.userId === userId);
  if (!target) throw new Error('Compte introuvable parmi les comptes connus.');

  const result = await api.anonymous<LoginResult>('/auth/refresh', { refreshToken: target.refreshToken });

  const previousAsOther: StoredAccount = {
    userId: current.user.id,
    schoolId: current.schoolId,
    schoolName: current.schoolName,
    role: current.user.role,
    refreshToken: current.refreshToken,
  };

  sessionStore.replace({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    user: result.user,
    schoolId: target.schoolId,
    schoolName: target.schoolName,
    accounts: [...current.accounts.filter((account) => account.userId !== userId), previousAsOther],
  });
}

/**
 * `POST /auth/link-account` — preuve, par identifiant+mot de passe, qu'un
 * second compte (identifiants différents) appartient à la même personne.
 * Couvre le cas que `identify()` ne peut pas détecter seul : un enseignant
 * qui est aussi parent dans la même école, par exemple. Le compte lié est
 * immédiatement ajouté aux comptes connus, utilisable tout de suite via
 * `switchAccount`.
 */
export async function linkAccount(identifier: string, password: string): Promise<void> {
  const result = await api.post<OtherAccount>('/auth/link-account', { identifier, password });
  const current = sessionStore.get();
  if (!current) return;

  const account: StoredAccount = {
    userId: result.userId,
    schoolId: result.schoolId,
    schoolName: result.schoolName,
    role: result.role,
    refreshToken: result.refreshToken,
  };
  sessionStore.replace({ ...current, accounts: [...current.accounts, account] });
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
