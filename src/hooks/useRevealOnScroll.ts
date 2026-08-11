import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Vrai une fois l'élément entré dans le viewport, pour de bon.
 *
 * Ne repasse jamais à faux : une section qui a déjà joué son animation ne
 * doit pas la rejouer en remontant la page, ce qui distrairait plus qu'autre
 * chose. `threshold` bas (10 %) : sur mobile, une carte haute de page ne
 * révèle jamais son bas si on attendait qu'elle soit entièrement visible.
 */
export function useRevealOnScroll<T extends HTMLElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, visible];
}
