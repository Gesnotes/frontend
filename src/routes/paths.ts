import type { Role } from '../api';

/** Chemins de l'application. Source unique : ne pas écrire d'URL en dur ailleurs. */
export const paths = {
  login: '/connexion',
  forgotPassword: '/mot-de-passe-oublie',
  resetPassword: '/reinitialiser-mot-de-passe',

  admin: {
    root: '/admin',
    dashboard: '/admin',
    classes: '/admin/classes',
    classDetail: (id: number | string) => `/admin/classes/${id}`,
    classBulletin: (id: number | string) => `/admin/classes/${id}/bulletin`,
    subjects: '/admin/matieres',
    teachers: '/admin/enseignants',
    students: '/admin/eleves',
  },

  teacher: {
    root: '/enseignant',
    dashboard: '/enseignant',
    gradeEntry: '/enseignant/saisie',
    history: '/enseignant/historique',
  },

  parent: {
    root: '/parent',
    home: '/parent',
    children: '/parent/enfants',
    child: (id: number | string) => `/parent/enfants/${id}`,
    grades: '/parent/notes',
    grade: (id: number | string) => `/parent/notes/${id}`,
  },
} as const;

/** Écran d'accueil d'un rôle après connexion. */
export function homePathFor(role: Role): string {
  if (role === 'admin') return paths.admin.root;
  if (role === 'teacher') return paths.teacher.root;
  return paths.parent.root;
}
