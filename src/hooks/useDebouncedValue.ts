import { useEffect, useState } from 'react';

/**
 * Valeur retardée : ne change qu'après `delay` millisecondes de stabilité.
 *
 * Sert aux champs de recherche, où chaque frappe déclenchait sinon une requête.
 * Taper « Sagbo » partait en cinq appels dont quatre inutiles — et autant
 * d'entrées d'erreur en console quand la saisie transitoire ne convenait pas
 * au serveur.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
