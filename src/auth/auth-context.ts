import { createContext, useContext } from 'react';

import type { AuthUser, Role } from '../api';

export type AuthContextValue = {
  user: AuthUser | null;
  role: Role | null;
  isAuthenticated: boolean;
  /** Nom affichable : identité si connue, sinon l'email. */
  displayName: string;
  login: (identifier: string, password: string) => Promise<AuthUser>;
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
