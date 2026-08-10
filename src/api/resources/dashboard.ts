import { useQuery } from '@tanstack/react-query';

import { api } from '../http';
import { todayLocalIso } from '../../lib/format';
import { queryKeys } from '../queryKeys';
import type { AdminDashboard, ID, RecentGrade } from '../types';

/**
 * `GET /admin/dashboard`.
 *
 * Sans `term_id`, la réponse garde la même forme mais les agrégats liés à une
 * période valent `null` ou un tableau vide.
 *
 * `date` : le jour local du navigateur, pour que « présence du jour » se
 * base sur le jour réel de l'utilisateur plutôt que sur celui du serveur.
 */
export function fetchDashboard(termId?: ID): Promise<AdminDashboard> {
  return api.get<AdminDashboard>('/admin/dashboard', { term_id: termId, date: todayLocalIso() });
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
