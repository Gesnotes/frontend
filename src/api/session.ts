import { SESSION_STORAGE_KEY } from './config';
import type { AuthUser, LoginResult } from './types';

export type Session = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

type Listener = (session: Session | null) => void;

/**
 * Dépôt de session, hors React.
 *
 * Le client HTTP a besoin du token à chaque requête et doit pouvoir purger la
 * session quand le refresh échoue ; passer par un contexte React créerait une
 * dépendance circulaire entre la couche réseau et l'arbre de composants.
 */
class SessionStore {
  private session: Session | null = readFromStorage();
  private listeners = new Set<Listener>();

  get(): Session | null {
    return this.session;
  }

  getAccessToken(): string | null {
    return this.session?.accessToken ?? null;
  }

  getRefreshToken(): string | null {
    return this.session?.refreshToken ?? null;
  }

  set(result: LoginResult): Session {
    const session: Session = {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
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

export const sessionStore = new SessionStore();

function readFromStorage(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.user) return null;
    return parsed as Session;
  } catch {
    // Stockage indisponible (mode privé) ou contenu corrompu : session absente.
    return null;
  }
}

function writeToStorage(session: Session | null): void {
  try {
    if (session) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Écriture impossible : la session reste valable pour l'onglet courant.
  }
}
