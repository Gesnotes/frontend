import type { Role } from '../api';

/** Chemins de l'application. Source unique : ne pas écrire d'URL en dur ailleurs. */
export const paths = {
  login: '/connexion',
  forgotPassword: '/mot-de-passe-oublie',
  resetPassword: '/reinitialiser-mot-de-passe',
  signup: '/inscription',

  admin: {
    root: '/admin',
    dashboard: '/admin',
    classes: '/admin/classes',
    classDetail: (id: number | string) => `/admin/classes/${id}`,
    classBulletin: (id: number | string) => `/admin/classes/${id}/bulletin`,
    classAttendance: (id: number | string) => `/admin/classes/${id}/presence`,
    classEnrollment: (id: number | string) => `/admin/classes/${id}/reinscription`,
    gradeEntry: '/admin/saisie',
    subjects: '/admin/matieres',
    teachers: '/admin/enseignants',
    students: '/admin/eleves',
    studentDetail: (id: number | string) => `/admin/eleves/${id}`,
    periods: '/admin/periodes',
    schoolYears: '/admin/annees-scolaires',
    archives: '/admin/archives',
    settings: '/admin/parametres',
  },

  teacher: {
    root: '/enseignant',
    dashboard: '/enseignant',
    gradeEntry: '/enseignant/saisie',
    attendance: '/enseignant/presence',
    history: '/enseignant/historique',
  },

  parent: {
    root: '/parent',
    home: '/parent',
    children: '/parent/enfants',
    child: (id: number | string) => `/parent/enfants/${id}`,
    grades: '/parent/notes',
    grade: (id: number | string) => `/parent/notes/${id}`,
    attendance: '/parent/presence',
    notifications: '/parent/alertes',
  },

  /** Espace de l'équipe Gesnotes — supervision de la plateforme. */
  staff: {
    login: '/equipe/connexion',
    root: '/equipe',
    dashboard: '/equipe',
    signupRequests: '/equipe/demandes',
    schools: '/equipe/ecoles',
  },
} as const;

/**
 * Saisie des notes pour un couple classe × matière.
 *
 * Le contexte vit dans l'URL plutôt que dans un état local : un enseignant
 * qui recharge la page, ou qui met la saisie d'une classe en favori, doit
 * retrouver la même grille.
 */
export function gradeEntryPath(classId: number, subjectId: number): string {
  return `${paths.teacher.gradeEntry}?classe=${classId}&matiere=${subjectId}`;
}

/** Écran d'accueil d'un rôle après connexion. */
export function homePathFor(role: Role): string {
  if (role === 'admin') return paths.admin.root;
  if (role === 'teacher') return paths.teacher.root;
  return paths.parent.root;
}
