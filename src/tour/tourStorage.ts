export type TourSpace = 'admin' | 'teacher' | 'parent';

const KEY_PREFIX = 'gesnotes.tour-vu.';

/**
 * Un seul indicateur par espace, jamais par utilisateur : le tutoriel montre
 * l'interface elle-même, pas des données propres à un compte — pas besoin
 * de le remontrer à chaque connexion sur le même appareil, même si le
 * compte change.
 */
export function hasSeenTour(space: TourSpace): boolean {
  try {
    return localStorage.getItem(KEY_PREFIX + space) === '1';
  } catch {
    return true; // Stockage indisponible : ne pas imposer le tutoriel à chaque rendu.
  }
}

export function markTourSeen(space: TourSpace): void {
  try {
    localStorage.setItem(KEY_PREFIX + space, '1');
  } catch {
    // Écriture impossible (mode privé) : le tutoriel se represente à la prochaine visite, sans conséquence grave.
  }
}
