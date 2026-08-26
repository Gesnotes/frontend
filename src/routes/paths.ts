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
    schedule: '/admin/emploi-du-temps',
    subjects: '/admin/matieres',
    teachers: '/admin/enseignants',
    teacherDetail: (id: number | string) => `/admin/enseignants/${id}`,
    students: '/admin/eleves',
    studentDetail: (id: number | string) => `/admin/eleves/${id}`,
    holidays: '/admin/calendrier',
    auditLog: '/admin/journal-audit',
    schoolYears: '/admin/annees-scolaires',
    archives: '/admin/archives',
    annonces: '/admin/annonces',
    settings: '/admin/parametres',
  },

  teacher: {
    root: '/enseignant',
    dashboard: '/enseignant',
    gradeEntry: '/enseignant/saisie',
    schedule: '/enseignant/emploi-du-temps',
    attendance: '/enseignant/presence',
    history: '/enseignant/historique',
    students: '/enseignant/eleves',
    studentDetail: (id: number | string) => `/enseignant/eleves/${id}`,
    annonces: '/enseignant/annonces',
  },

  parent: {
    root: '/parent',
    home: '/parent',
    child: (id: number | string) => `/parent/enfants/${id}`,
    scolarite: '/parent/scolarite',
    suiviParental: '/parent/suivi-parental',
    grades: '/parent/notes',
    grade: (id: number | string) => `/parent/notes/${id}`,
    attendance: '/parent/presence',
    schedule: '/parent/emploi-du-temps',
    notifications: '/parent/alertes',
  },

  /** Espace de l'équipe Gesnotes — supervision de la plateforme. */
  staff: {
    login: '/equipe/connexion',
    forgotPassword: '/equipe/mot-de-passe-oublie',
    resetPassword: '/equipe/reinitialiser-mot-de-passe',
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
