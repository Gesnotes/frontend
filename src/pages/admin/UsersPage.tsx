import {
  RotateCcw, Search, ShieldCheck, UserRoundX, Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  errorMessage, usersApi, type Role, type UserAccount,
} from '../../api';
import { useAuth } from '../../auth/auth-context';
import { QueryBoundary } from '../../components/QueryBoundary';
import { formatCount, formatDate } from '../../lib/format';
import { personName } from '../../lib/text';
import { toneClasses } from '../../ui/tone';
import { paths } from '../../routes/paths';
import {
  Avatar, ConfirmDialog, Skeleton, StatCardIcon, useToast,
} from '../../ui';

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  teacher: 'Enseignant',
  parent: 'Parent',
};

const ROLE_TONE: Record<Role, 'info' | 'warning' | 'success'> = {
  admin: 'info',
  teacher: 'warning',
  parent: 'success',
};

/**
 * Vue unifiée des comptes de l'école, tous rôles confondus.
 *
 * Les enseignants restent gérés depuis /admin/enseignants (leurs
 * affectations et le détachement de classe y sont déjà traités) : ici, leurs
 * comptes sont visibles pour la vue d'ensemble mais pas archivables, pour ne
 * pas dupliquer cette logique.
 */
export default function UsersPage() {
  const toast = useToast();
  const { user: currentUser } = useAuth();

  const [role, setRole] = useState<Role | ''>('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [toArchive, setToArchive] = useState<UserAccount | null>(null);

  const users = usersApi.useUsers({ role: role || undefined, includeArchived });
  const archive = usersApi.useArchiveUserAccount();
  const restore = usersApi.useRestoreUserAccount();

  const list = users.data ?? [];
  const admins = list.filter((u) => u.role === 'admin' && !u.archivedAt).length;
  const parents = list.filter((u) => u.role === 'parent' && !u.archivedAt).length;
  const active = list.filter((u) => !u.archivedAt).length;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return list;
    return list.filter((account) => {
      const haystack = `${personName(account, account.email)} ${account.email}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [list, search]);

  async function confirmArchive() {
    if (!toArchive) return;
    try {
      await archive.mutateAsync(toArchive.id);
      toast.success('Compte désactivé');
      setToArchive(null);
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  async function runRestore(account: UserAccount) {
    try {
      await restore.mutateAsync(account.id);
      toast.success('Compte réactivé');
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-8 py-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="mt-1 text-sm text-gray-500">
            {users.data
              ? `${formatCount(active)} compte${active > 1 ? 's' : ''} actif${active > 1 ? 's' : ''}`
              : 'Tous les comptes de l’école'}
          </p>
        </div>
      </div>

      <div className="space-y-6 p-8">
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <label className="relative min-w-[260px] flex-1">
            <span className="sr-only">Rechercher un utilisateur</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              placeholder="Rechercher un nom ou un email…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={role}
            onChange={(e) => setRole(e.target.value as Role | '')}
          >
            <option value="">Tous les rôles</option>
            <option value="admin">Administrateurs</option>
            <option value="teacher">Enseignants</option>
            <option value="parent">Parents</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Afficher les comptes désactivés
          </label>
        </div>

        <QueryBoundary query={users} loading={<TableSkeleton />}>
          {() =>
            filtered.length === 0 ? (
              <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                <p className="font-semibold text-gray-900">
                  {list.length === 0 ? 'Aucun compte' : 'Aucun compte ne correspond à ce filtre'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {list.length === 0 ? 'Aucun compte ne correspond à ces critères.' : 'Essayez un autre nom ou un autre rôle.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-6 py-3">Compte</th>
                      <th className="px-6 py-3">Rôle</th>
                      <th className="px-6 py-3">Statut</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((account) => {
                      const isSelf = currentUser?.id === account.id;
                      return (
                        <tr key={account.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={personName(account, account.email)} size={36} brand />
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-gray-900">
                                  {personName(account, account.email)}
                                </div>
                                <div className="truncate text-xs text-gray-500">{account.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses(ROLE_TONE[account.role])}`}>
                              {ROLE_LABELS[account.role]}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {account.archivedAt ? (
                              <span className="text-xs text-gray-500">
                                Désactivé le {formatDate(account.archivedAt)}
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                Actif
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              {account.role === 'teacher' ? (
                                <Link
                                  to={paths.admin.teachers}
                                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                  Gérer depuis Enseignants
                                </Link>
                              ) : account.archivedAt ? (
                                <button
                                  type="button"
                                  onClick={() => void runRestore(account)}
                                  title="Réactiver"
                                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                >
                                  <RotateCcw size={16} aria-hidden="true" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isSelf}
                                  onClick={() => setToArchive(account)}
                                  title={isSelf ? 'Vous ne pouvez pas désactiver votre propre compte' : 'Désactiver'}
                                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                                >
                                  <UserRoundX size={16} aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          }
        </QueryBoundary>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <StatCardIcon icon={Users} tone="bg-[#dde1ff] text-[#173bab]" label="Comptes actifs" value={formatCount(active)} />
          <StatCardIcon icon={ShieldCheck} tone="bg-violet-50 text-violet-600" label="Administrateurs" value={formatCount(admins)} />
          <StatCardIcon icon={Users} tone="bg-emerald-50 text-emerald-600" label="Parents" value={formatCount(parents)} />
        </div>
      </div>

      <ConfirmDialog
        open={toArchive !== null}
        title="Désactiver ce compte ?"
        description={`${toArchive ? personName(toArchive, toArchive.email) : ''} ne pourra plus se connecter et ses sessions en cours sont coupées. Le compte peut être réactivé à tout moment.`}
        confirmLabel="Désactiver"
        loading={archive.isPending}
        onCancel={() => setToArchive(null)}
        onConfirm={() => void confirmArchive()}
      />
    </>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} height={52} style={{ marginBottom: 12 }} />
      ))}
    </div>
  );
}
