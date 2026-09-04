import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Contenu d'une étape du tutoriel guidé (react-joyride) — un badge d'icône,
 * un titre court et une explication, plutôt qu'une simple phrase brute :
 * chaque étape doit se lire comme la définition d'un champ ou d'un bouton,
 * pas comme une notice.
 */
export function TourStepCard({
  icon: Icon, title, centered = false, children,
}: {
  icon?: LucideIcon;
  title: string;
  centered?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`flex max-w-xs flex-col gap-2 ${centered ? 'items-center text-center' : 'text-left'}`}>
      {Icon ? (
        <span
          className={`flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-content ${
            centered ? 'h-11 w-11' : 'h-8 w-8'
          }`}
        >
          <Icon size={centered ? 22 : 16} aria-hidden="true" />
        </span>
      ) : null}
      <span className={`font-bold text-base-content ${centered ? 'text-base' : 'text-[15px]'}`}>{title}</span>
      <p className="m-0 text-sm leading-relaxed text-neutral">{children}</p>
    </div>
  );
}
