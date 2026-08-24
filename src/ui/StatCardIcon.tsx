import type { LucideIcon } from 'lucide-react';

/**
 * Carte statistique Tailwind (icône colorée + libellé + valeur), pour les
 * écrans admin reconstruits sur la maquette Front-Admin.
 */
export function StatCardIcon({
  icon: Icon, tone, label, value, hint,
}: { icon: LucideIcon; tone: string; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-gray-500">{label}</div>
          <div className="mt-2 truncate text-3xl font-bold text-gray-900">{value}</div>
          {hint ? <div className="mt-1 truncate text-xs text-gray-400">{hint}</div> : null}
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${tone}`}>
          <Icon size={22} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
