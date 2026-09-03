import { createContext, useContext } from 'react';

import type { TourSpace } from './tourStorage';

export interface TourContextValue {
  /** Relance le tutoriel de l'espace donné, qu'il ait déjà été vu ou non — le bouton « revoir le tutoriel ». */
  start: (space: TourSpace) => void;
  /** Lance le tutoriel seulement s'il n'a jamais été vu sur cet appareil — l'accueil automatique d'un nouvel arrivant. */
  startIfFirstVisit: (space: TourSpace) => void;
}

export const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour doit être utilisé sous TourProvider');
  return ctx;
}
