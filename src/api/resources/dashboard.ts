import { useQuery } from '@tanstack/react-query';

import { api } from '../http';
import { queryKeys } from '../queryKeys';
import type { AdminDashboard, ID, RecentGrade } from '../types';

/**
 * `GET /admin/dashboard`.
 *
 * Sans `term_id`, la réponse garde la même forme mais les agrégats liés à une
 * période valent `null` ou un tableau vide.
 */
export function fetchDashboard(termId?: ID): Promise<AdminDashboard> {
  return api.get<AdminDashboard>('/admin/dashboard', { term_id: termId });
}

export function fetchRecentGrades(limit = 20): Promise<RecentGrade[]> {
  return api.get<RecentGrade[]>('/admin/dashboard/recent-grades', { limit });
}

// ------------------------------------------------------------------- Hooks

export function useDashboard(termId?: ID) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(termId),
    queryFn: () => fetchDashboard(termId),
  });
}

export function useRecentGrades(limit = 20) {
  return useQuery({
    queryKey: queryKeys.dashboard.recentGrades(limit),
    queryFn: () => fetchRecentGrades(limit),
  });
}
