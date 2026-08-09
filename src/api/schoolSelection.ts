import { useEffect, useState } from 'react';

import { SCHOOL_SELECTION_STORAGE_KEY } from './config';

export type SchoolSelection = { subdomain: string; name: string; city: string | null };

type Listener = (selection: SchoolSelection | null) => void;

/**
 * École choisie sur cet appareil, hors sous-domaine réel de l'adresse.
 *
 * Dépôt hors React, sur le modèle de `sessionStore` : le client HTTP lit la
 * sélection à chaque requête pour poser `X-School-Subdomain`, et doit
 * pouvoir le faire sans dépendre de l'arbre de composants.
 */
class SchoolSelectionStore {
  private selection: SchoolSelection | null = readFromStorage();
  private listeners = new Set<Listener>();

  get(): SchoolSelection | null {
    return this.selection;
  }

  set(selection: SchoolSelection): void {
    this.selection = selection;
    writeToStorage(selection);
    this.emit();
  }

  clear(): void {
    this.selection = null;
    writeToStorage(null);
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    for (const listener of this.listeners) listener(this.selection);
  }
}

export const schoolSelectionStore = new SchoolSelectionStore();

/** École choisie sur cet appareil, réactif aux changements. */
export function useSchoolSelection(): SchoolSelection | null {
  const [selection, setSelection] = useState(() => schoolSelectionStore.get());
  useEffect(() => schoolSelectionStore.subscribe(setSelection), []);
  return selection;
}

function readFromStorage(): SchoolSelection | null {
  try {
    const raw = localStorage.getItem(SCHOOL_SELECTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SchoolSelection>;
    if (!parsed.subdomain || !parsed.name) return null;
    return { subdomain: parsed.subdomain, name: parsed.name, city: parsed.city ?? null };
  } catch {
    return null;
  }
}

function writeToStorage(selection: SchoolSelection | null): void {
  try {
    if (selection) localStorage.setItem(SCHOOL_SELECTION_STORAGE_KEY, JSON.stringify(selection));
    else localStorage.removeItem(SCHOOL_SELECTION_STORAGE_KEY);
  } catch {
    // Stockage indisponible : le choix ne survit qu'à l'onglet courant.
  }
}
