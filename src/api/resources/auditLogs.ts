import { useQuery } from '@tanstack/react-query';

import { api } from '../http';
import { queryKeys } from '../queryKeys';
import type { AuditLogEntry } from '../types';

/** `GET /admin/audit-logs` — journal d'audit, lecture seule, réservé à l'administration. */
export function fetchAuditLogs(limit = 50): Promise<AuditLogEntry[]> {
  return api.get<AuditLogEntry[]>('/admin/audit-logs', { limit });
}

export function useAuditLogs(limit = 50) {
  return useQuery({
    queryKey: queryKeys.auditLogs.list(limit),
    queryFn: () => fetchAuditLogs(limit),
  });
}
