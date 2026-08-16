import { SESSION_STORAGE_KEY } from './config';
import type { AuthUser, IdentifyOk, LoginResult, OtherAccount, Role } from './types';

/** Un autre compte connu, prêt à activer via `POST /auth/refresh`. */
export type StoredAccount = {
  userId: AuthUser['id'];
  schoolId: number;
  schoolName: string;
  role: Role;
  refreshToken: string;
};

export type Session = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  schoolId: number;
  schoolName: string;
  /** Les AUTRES comptes accessibles à la même personne — jamais le compte actif. */
  accounts: StoredAccount[];
};

type Listener = (session: Session | null) => void;

function toStoredAccount(account: OtherAccount): StoredAccount {
  return {
    userId: account.userId,
    schoolId: account.schoolId,
    schoolName: account.schoolName,
    role: account.role,
    refreshToken: account.refreshToken,
  };
}

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

  /** Connexion complète (`POST /auth/identify`, statut `ok`) : remplace tout. */
  setFromIdentify(result: IdentifyOk): Session {
    return this.replace({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
      schoolId: result.school.id,
      schoolName: result.school.name,
      accounts: result.otherAccounts.map(toStoredAccount),
    });
  }

  /**
   * Rafraîchissement du même compte (401 rejoué par le client HTTP) : seuls
   * les jetons et l'identité changent, l'école et les autres comptes connus
   * restent ceux de la session en cours. N'est jamais appelé sans session
   * existante — `getRefreshToken()` en amont le garantit.
   */
  setFromRefresh(result: LoginResult): Session {
    const current = this.session;
    if (!current) throw new Error('setFromRefresh appelé sans session active');
    return this.replace({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
      schoolId: current.schoolId,
      schoolName: current.schoolName,
      accounts: current.accounts,
    });
  }

  /**
   * Remplacement complet et déjà construit — utilisé par `authApi.switchAccount`
   * (bascule vers un autre compte connu, `accounts` recalculé par l'appelant
   * pour y ranger le compte qu'on quitte) et `authApi.linkAccount` (ajout d'un
   * compte fraîchement lié à la liste existante).
   */
  replace(session: Session): Session {
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
    // `schoolId`/`schoolName`/`accounts` sont apparus après coup : une session
    // stockée par une version antérieure du client ne les a pas. Mieux vaut
    // redemander une connexion que de garder une session dont ces champs
    // manquent — tout le code qui suit les suppose toujours présents.
    if (
      !parsed.accessToken ||
      !parsed.refreshToken ||
      !parsed.user ||
      !parsed.schoolId ||
      !parsed.schoolName ||
      !Array.isArray(parsed.accounts)
    ) {
      return null;
    }
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
