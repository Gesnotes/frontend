import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { staffApiFetch } from '../staffHttp';
import { staffSessionStore } from '../staffSession';
import { queryKeys } from '../queryKeys';
import type {
  AcceptSignupRequestPayload,
  AcceptSignupRequestResult,
  ID,
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
