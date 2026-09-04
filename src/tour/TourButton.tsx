import { HelpCircle } from 'lucide-react';

import { useTour } from './tour-context';
import type { TourSpace } from './tourStorage';

/** Bouton « revoir le tutoriel » — relance le tour de l'espace donné, à tout moment. */
export function TourButton({ space, className }: { space: TourSpace; className?: string }) {
  const { start } = useTour();

  return (
    <button
      type="button"
      onClick={() => start(space)}
      className={className}
      title="Revoir le tutoriel"
      aria-label="Revoir le tutoriel"
    >
      <HelpCircle size={18} aria-hidden="true" />
    </button>
  );
}
