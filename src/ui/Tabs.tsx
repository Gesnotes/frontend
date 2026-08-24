import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export type TabItem = {
  key: string;
  label: string;
  /** Ex. un effectif ou un compteur, affiché à côté du libellé. */
  badge?: string | number;
};

/**
 * Onglets accessibles (`role="tablist"`), un seul panneau monté à la fois.
 *
 * Le contenu de chaque onglet reste au parent (`children` de l'appelant, pas
 * de ce composant) : `Tabs` ne fait que le sélecteur, pour rester réutilisable
 * sans imposer de structure au panneau actif.
 */
export function Tabs({
  items, activeKey, onChange,
}: {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  function focusTab(index: number) {
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    const button = buttons?.[(index + items.length) % items.length];
    button?.focus();
    if (button) onChange(items[(index + items.length) % items.length].key);
  }

  function onKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusTab(index + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusTab(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusTab(items.length - 1);
    }
  }

  return (
    <div className="ui-tabs" role="tablist" ref={listRef}>
      {items.map((item, index) => {
        const selected = item.key === activeKey;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            id={`tab-${item.key}`}
            aria-selected={selected}
            aria-controls={`tabpanel-${item.key}`}
            tabIndex={selected ? 0 : -1}
            className={`ui-tabs__tab${selected ? ' ui-tabs__tab--active' : ''}`}
            onClick={() => onChange(item.key)}
            onKeyDown={(e) => onKeyDown(e, index)}
          >
            {item.label}
            {item.badge !== undefined ? <span className="ui-tabs__badge">{item.badge}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  tabKey, activeKey, children,
}: {
  tabKey: string;
  activeKey: string;
  children: ReactNode;
}) {
  if (tabKey !== activeKey) return null;
  return (
    <div role="tabpanel" id={`tabpanel-${tabKey}`} aria-labelledby={`tab-${tabKey}`} className="page-stack">
      {children}
    </div>
  );
}
