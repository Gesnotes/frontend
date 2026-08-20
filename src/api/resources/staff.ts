import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { staffApiFetch } from '../staffHttp';
import { staffSessionStore } from '../staffSession';
import { queryKeys } from '../queryKeys';
import type {
  AcceptSignupRequestPayload,
  AcceptSignupRequestResult,
  ID,
  MessageResponse,
  PlatformOverview,
  SchoolWithMetrics,
  SignupRequestRow,
  SignupRequestStatus,
  StaffLoginResult,
} from '../types';

/** `POST /staff/login`. */
export async function login(email: string, password: string): Promise<StaffLoginResult> {
  const result = await staffApiFetch<StaffLoginResult>('/staff/login', {
    method: 'POST',
    body: { email, password },
    anonymous: true,
  });
  staffSessionStore.set(result);
  return result;
}

/**
 * `POST /staff/forgot-password`.
 *
 * La réponse est identique que le compte existe ou non (anti-énumération) :
 * l'UI ne doit donc jamais annoncer « compte inconnu ».
 */
export function forgotPassword(email: string): Promise<MessageResponse> {
  return staffApiFetch<MessageResponse>('/staff/forgot-password', {
    method: 'POST',
    body: { email },
    anonymous: true,
  });
}

/** `POST /staff/reset-password` — le token vient du lien reçu par email. */
export function resetPassword(token: string, password: string): Promise<MessageResponse> {
  return staffApiFetch<MessageResponse>('/staff/reset-password', {
    method: 'POST',
    body: { token, password },
    anonymous: true,
  });
}

/** `POST /staff/logout`. La session locale est purgée même si l'appel échoue. */
export async function logout(): Promise<void> {
  const refreshToken = staffSessionStore.getRefreshToken();
  try {
    if (refreshToken) await staffApiFetch('/staff/logout', { method: 'POST', body: { refreshToken } });
  } finally {
    staffSessionStore.clear();
  }
}

export function fetchOverview(): Promise<PlatformOverview> {
  return staffApiFetch<PlatformOverview>('/staff/overview');
}

export function fetchSchools(): Promise<SchoolWithMetrics[]> {
  return staffApiFetch<SchoolWithMetrics[]>('/staff/schools');
}

export function fetchSignupRequests(status?: SignupRequestStatus): Promise<SignupRequestRow[]> {
  return staffApiFetch<SignupRequestRow[]>('/staff/signup-requests', { query: { status } });
}

export function acceptSignupRequest(
  id: ID,
  payload: AcceptSignupRequestPayload,
): Promise<AcceptSignupRequestResult> {
  return staffApiFetch<AcceptSignupRequestResult>(`/staff/signup-requests/${id}/accept`, {
    method: 'POST',
    body: payload,
  });
}

export function declineSignupRequest(id: ID): Promise<void> {
  return staffApiFetch<void>(`/staff/signup-requests/${id}/decline`, { method: 'POST' });
}

/**
 * Suspend une école : ses comptes ne peuvent plus se connecter, sessions en
 * cours révoquées, rien détruit — restaurable à tout moment.
 */
export function suspendSchool(id: ID): Promise<void> {
  return staffApiFetch<void>(`/staff/schools/${id}`, { method: 'DELETE' });
}

export function restoreSchool(id: ID): Promise<void> {
  return staffApiFetch<void>(`/staff/schools/${id}/restore`, { method: 'POST' });
}

/**
 * Suppression définitive : l'école doit déjà être suspendue, et le nom exact
 * doit être ressaisi. Efface l'école et tout ce qu'elle contient.
 */
export function deleteSchoolPermanently(id: ID, confirmLabel: string): Promise<void> {
  return staffApiFetch<void>(`/staff/schools/${id}`, {
    method: 'DELETE',
    query: { permanent: true, confirm_label: confirmLabel },
  });
}

// ------------------------------------------------------------------- Hooks

export function useOverview() {
  return useQuery({ queryKey: queryKeys.staff.overview, queryFn: fetchOverview });
}

export function useSchools() {
  return useQuery({ queryKey: queryKeys.staff.schools, queryFn: fetchSchools });
}

export function useSignupRequests(status?: SignupRequestStatus) {
  return useQuery({
    queryKey: queryKeys.staff.signupRequests(status),
    queryFn: () => fetchSignupRequests(status),
  });
}

/** Accepter change aussi les effectifs (nouvelle école) : la vue d'ensemble est invalidée avec. */
export function useAcceptSignupRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: ID; payload: AcceptSignupRequestPayload }) =>
      acceptSignupRequest(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.staff.all });
    },
  });
}

export function useDeclineSignupRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => declineSignupRequest(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.staff.all });
    },
  });
}

export function useSuspendSchool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => suspendSchool(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.staff.schools });
    },
  });
}

export function useRestoreSchool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => restoreSchool(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.staff.schools });
    },
  });
}

export function useDeleteSchoolPermanently() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, confirmLabel }: { id: ID; confirmLabel: string }) =>
      deleteSchoolPermanently(id, confirmLabel),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.staff.all });
    },
  });
}
