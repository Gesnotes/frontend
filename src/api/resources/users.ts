import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../http';
import { queryKeys } from '../queryKeys';
import type { ID, Role, UserAccount } from '../types';

/** `GET /users` — vue unifiée des comptes de l'école, tous rôles confondus. */
export function fetchUsers(filters: { role?: Role; includeArchived?: boolean } = {}): Promise<UserAccount[]> {
  return api.get<UserAccount[]>('/users', {
    role: filters.role,
    include_archived: filters.includeArchived ? 'true' : 'false',
  });
}

/** Archivage : réservé aux comptes admin et parent — un enseignant se gère depuis /admin/enseignants. */
export function archiveUserAccount(id: ID): Promise<UserAccount> {
  return api.delete<UserAccount>(`/users/${id}`);
}

export function restoreUserAccount(id: ID): Promise<UserAccount> {
  return api.post<UserAccount>(`/users/${id}/restore`);
}

// ------------------------------------------------------------------- Hooks

export function useUsers(filters: { role?: Role; includeArchived?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.users.list(filters.role, filters.includeArchived),
    queryFn: () => fetchUsers(filters),
  });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
}

export function useArchiveUserAccount() {
  const invalidate = useInvalidateUsers();
  return useMutation({ mutationFn: archiveUserAccount, onSuccess: invalidate });
}

export function useRestoreUserAccount() {
  const invalidate = useInvalidateUsers();
  return useMutation({ mutationFn: restoreUserAccount, onSuccess: invalidate });
}
