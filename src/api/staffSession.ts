import { STAFF_SESSION_STORAGE_KEY } from './config';
import type { StaffAuthUser, StaffLoginResult } from './types';

export type StaffSession = {
  accessToken: string;
  refreshToken: string;
  staff: StaffAuthUser;
};

type Listener = (session: StaffSession | null) => void;

/**
 * Dépôt de session de l'équipe Gesnotes, sur le modèle de `sessionStore`.
 *
 * Fichier distinct plutôt que réutiliser `sessionStore` : les deux mondes
 * (compte client d'une école, compte staff) ne partagent ni jeton, ni
 * stockage, ni logique de rafraîchissement — les mélanger romprait
 * l'isolation que `requireStaffAuth` garantit côté serveur.
 */
class StaffSessionStore {
  private session: StaffSession | null = readFromStorage();
  private listeners = new Set<Listener>();

  get(): StaffSession | null {
    return this.session;
  }

  getAccessToken(): string | null {
    return this.session?.accessToken ?? null;
  }

  getRefreshToken(): string | null {
    return this.session?.refreshToken ?? null;
  }

  set(result: StaffLoginResult): StaffSession {
    const session: StaffSession = {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      staff: result.staff,
    };
    this.session = session;
    writeToStorage(session);
    this.emit();
    return session;
  }

  clear(): void {
    this.session = null;
    writeToStorage(null);
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    for (const listener of this.listeners) listener(this.session);
  }
}

export const staffSessionStore = new StaffSessionStore();

function readFromStorage(): StaffSession | null {
  try {
    const raw = localStorage.getItem(STAFF_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StaffSession>;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.staff) return null;
    return parsed as StaffSession;
  } catch {
    return null;
  }
}

function writeToStorage(session: StaffSession | null): void {
  try {
    if (session) localStorage.setItem(STAFF_SESSION_STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STAFF_SESSION_STORAGE_KEY);
  } catch {
    // Stockage indisponible : la session reste valable pour l'onglet courant.
  }
}
