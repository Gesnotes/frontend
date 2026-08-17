import { createContext, useContext } from 'react';

import type { AuthUser, IdentifyResult, Role, StoredAccount } from '../api';

export type AuthContextValue = {
  user: AuthUser | null;
  role: Role | null;
  isAuthenticated: boolean;
  /** Nom affichable : identité si connue, sinon l'email. */
  displayName: string;
  /** École du compte actif — vide hors session. */
  schoolName: string;
  /** Les AUTRES comptes accessibles à la même personne, jamais le compte actif. */
  accounts: StoredAccount[];
  /**
   * Connexion : seule porte d'entrée, aucune école n'est résolue au
   * préalable. `schoolId` tranche le cas où plusieurs comptes correspondent
   * (voir `authApi.identify`).
   */
  identify: (identifier: string, password: string, schoolId?: number) => Promise<IdentifyResult>;
  /**
   * Bascule vers un des `accounts` connus, sans repasser par `identify`.
   * Identifié par `userId`, pas `schoolId` : deux comptes liés peuvent
   * partager la même école (voir `authApi.switchAccount`).
   */
  switchAccount: (userId: number) => Promise<void>;
  /** Preuve, par identifiant+mot de passe, qu'un second compte est la même personne. */
  linkAccount: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth doit être utilisé à l’intérieur de <AuthProvider>');
  return value;
}

/** Nom complet d'un utilisateur, avec repli sur l'email. */
export function fullNameOf(user: Pick<AuthUser, 'firstName' | 'lastName' | 'email'>): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.email;
}
