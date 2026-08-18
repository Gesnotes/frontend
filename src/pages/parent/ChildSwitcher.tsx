import type { ChildSummary, ID } from '../../api';
import { useChildContext } from '../../context/child-context';
import { Avatar } from '../../ui';

/**
 * Changer d'enfant : une rangée d'avatars, identique sur tous les écrans qui
 * dépendent de `ChildProvider` — pas seulement l'accueil. Avec un seul
 * enfant, la rangée n'apporte rien : une simple ligne d'identité suffit.
 */
export function ChildSwitcher() {
  const { child, children, childId, selectChild } = useChildContext();

  if (children.length > 1) {
    return <ChildAvatarRow children={children} activeId={childId} onSelect={selectChild} />;
  }

  if (!child) return null;
  return (
    <p className="text-sm text-gray-500">
      {child.firstName} {child.lastName} · {child.classe.name}
    </p>
  );
}

function ChildAvatarRow({
  children, activeId, onSelect,
}: { children: ChildSummary[]; activeId: ID | undefined; onSelect: (id: ID) => void }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Profil</p>
      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Changer d'enfant">
        {children.map((c) => {
          const active = c.id === activeId;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(c.id)}
              className={`flex w-16 shrink-0 flex-col items-center gap-2 ${active ? '' : 'opacity-60'}`}
            >
              <span
                className={`flex h-15 w-15 items-center justify-center rounded-full border-2 ${
                  active ? 'border-[#173bab]' : 'border-transparent'
                }`}
              >
                <Avatar name={`${c.firstName} ${c.lastName}`} size={52} brand={active} />
              </span>
              <span className="w-full truncate text-center text-xs font-semibold text-gray-700">{c.firstName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
