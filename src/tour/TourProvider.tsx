import { lazy, Suspense, useCallback, useMemo, useState, type ReactNode } from 'react';
import { STATUS, type EventData, type Step } from 'react-joyride';
import { useNavigate } from 'react-router-dom';

import { adminSteps, parentSteps, teacherSteps } from './steps';
import { TourContext, type TourContextValue } from './tour-context';
import { hasSeenTour, markTourSeen, type TourSpace } from './tourStorage';

/**
 * `react-joyride` pèse dans les ~80 Ko : chargé en retard, pas dans le
 * bundle principal — la landing page et les écrans de connexion (aucun des
 * deux n'affiche jamais de tutoriel) n'ont pas à le payer. `TourProvider`
 * ne rend ce composant qu'une fois `space` non nul, donc seulement après un
 * premier `start`/`startIfFirstVisit` réel.
 */
const LazyJoyride = lazy(() => import('react-joyride').then((m) => ({ default: m.Joyride })));

/**
 * Tutoriel guidé de l'interface (react-joyride), un par espace.
 *
 * Monté une seule fois près de la racine : un seul `<Joyride>` suffit, ses
 * `steps` changent selon l'espace lancé plutôt que d'en monter trois en
 * parallèle. Remplace l'ancienne checklist de configuration de l'espace
 * admin — celle-ci n'expliquait que la mise en route, celui-ci montre
 * l'interface elle-même et se relance à tout moment.
 *
 * Chaque étape change de page (voir `steps.ts::goTo`) : le tour a besoin de
 * `useNavigate`, donc de vivre sous `<BrowserRouter>` — c'est déjà le cas
 * dans `main.tsx`.
 */
export function TourProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [space, setSpace] = useState<TourSpace | null>(null);
  const [run, setRun] = useState(false);

  const stepsBySpace = useMemo<Record<TourSpace, Step[]>>(
    () => ({
      admin: adminSteps(navigate),
      teacher: teacherSteps(navigate),
      parent: parentSteps(navigate),
    }),
    [navigate],
  );

  const start = useCallback((next: TourSpace) => {
    setSpace(next);
    setRun(true);
  }, []);

  const startIfFirstVisit = useCallback((next: TourSpace) => {
    if (hasSeenTour(next)) return;
    setSpace(next);
    setRun(true);
  }, []);

  const handleEvent = useCallback(
    (data: EventData) => {
      if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
        setRun(false);
        if (space) markTourSeen(space);
      }
    },
    [space],
  );

  const value = useMemo<TourContextValue>(() => ({ start, startIfFirstVisit }), [start, startIfFirstVisit]);

  return (
    <TourContext.Provider value={value}>
      {children}
      {space ? (
        <Suspense fallback={null}>
          <LazyJoyride
            run={run}
            steps={stepsBySpace[space]}
            continuous
            scrollToFirstStep
            onEvent={handleEvent}
            locale={{
              back: 'Précédent',
              close: 'Fermer',
              last: 'Terminer',
              next: 'Suivant',
              nextWithProgress: 'Suivant ({current}/{total})',
              skip: 'Passer',
            }}
            options={{
              primaryColor: '#00288e',
              zIndex: 10000,
              buttons: ['back', 'close', 'primary', 'skip'],
              showProgress: true,
              // Chaque étape navigue vers une nouvelle page avant d'afficher
              // sa cible (voir steps.ts::goTo) : le défaut (1000 ms) laisse
              // trop peu de temps au rendu de la page et à ses propres
              // données pour apparaître avant que Joyride n'abandonne.
              targetWaitTimeout: 6000,
            }}
          />
        </Suspense>
      ) : null}
    </TourContext.Provider>
  );
}
