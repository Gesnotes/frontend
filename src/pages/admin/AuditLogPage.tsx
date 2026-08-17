import { ScrollText } from 'lucide-react';

import { auditLogsApi, type AuditAction, type AuditLogEntry } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { formatCount } from '../../lib/format';
import { toneClasses } from '../../ui/tone';
import { Skeleton } from '../../ui';

const ACTION_LABELS: Record<AuditAction, string> = {
  'grade.updated': 'Note modifiée',
  'grade.deleted': 'Note supprimée',
  'student.moved': 'Élève déplacé de classe',
  'account.archived': 'Compte désactivé',
  'account.restored': 'Compte réactivé',
  'account.permanently_deleted': 'Compte supprimé définitivement',
};

const ACTION_TONE: Record<AuditAction, 'info' | 'warning' | 'success' | 'danger'> = {
  'grade.updated': 'info',
  'grade.deleted': 'danger',
  'student.moved': 'info',
  'account.archived': 'warning',
  'account.restored': 'success',
  'account.permanently_deleted': 'danger',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  teacher: 'Enseignant',
  parent: 'Parent',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Détail en langage clair, à partir du `metadata` libre associé à chaque action. */
function detailOf(entry: AuditLogEntry): string | null {
  const meta = (entry.metadata ?? {}) as Record<string, unknown>;

  switch (entry.action) {
    case 'grade.updated':
      if (typeof meta.oldValue === 'number' && typeof meta.newValue === 'number') {
        return `${meta.oldValue} → ${meta.newValue}`;
      }
      return null;
    case 'grade.deleted':
      return typeof meta.value === 'number' ? `Note de ${meta.value}` : null;
    case 'student.moved':
      if (typeof meta.fromClassName === 'string' && typeof meta.toClassName === 'string') {
        return `${meta.fromClassName} → ${meta.toClassName}`;
      }
      return null;
    default:
      return null;
  }
}

/**
 * Journal d'audit : lecture seule, volontairement borné à quelques actions
 * sensibles (notes modifiées/supprimées, élèves déplacés de classe, comptes
 * archivés/restaurés/supprimés définitivement) — pas une trace générique de
 * toute mutation de l'application.
 */
export default function AuditLogPage() {
  const logs = auditLogsApi.useAuditLogs(100);
  const list = logs.data ?? [];

  return (
    <>
      <div className="border-b border-gray-100 bg-white px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900">Journal d'audit</h1>
        <p className="mt-1 text-sm text-gray-500">
          {logs.data
            ? `${formatCount(list.length)} action${list.length > 1 ? 's' : ''} tracée${list.length > 1 ? 's' : ''}`
            : 'Notes, élèves déplacés, comptes désactivés — actions sensibles seulement'}
        </p>
      </div>

      <div className="space-y-6 p-8">
        <QueryBoundary query={logs} loading={<TableSkeleton />}>
          {() =>
            list.length === 0 ? (
              <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                <ScrollText className="mx-auto mb-3 text-gray-300" size={32} aria-hidden="true" />
                <p className="font-semibold text-gray-900">Aucune action tracée</p>
                <p className="mt-1 text-sm text-gray-500">
                  Les notes modifiées ou supprimées, les élèves déplacés de classe et les comptes
                  désactivés, restaurés ou supprimés définitivement apparaîtront ici.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Acteur</th>
                      <th className="px-6 py-3">Action</th>
                      <th className="px-6 py-3">Détail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {list.map((entry) => {
                      const detail = detailOf(entry);
                      return (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-6 py-4 text-xs text-gray-500">
                            {formatDateTime(entry.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900">{entry.actorName}</div>
                            <div className="text-xs text-gray-500">{ROLE_LABELS[entry.actorRole] ?? entry.actorRole}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses(ACTION_TONE[entry.action])}`}>
                              {ACTION_LABELS[entry.action] ?? entry.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {entry.targetLabel ?? '—'}
                            {detail ? <span className="ml-2 text-gray-400">· {detail}</span> : null}
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
      </div>
    </>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} height={44} style={{ marginBottom: 12 }} />
      ))}
    </div>
  );
}
