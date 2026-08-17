import type { Role } from '../api';
import { paths } from '../routes/paths';

export type NavItem = {
  to: string;
  label: string;
  icon: string;
  /** Vrai pour la racine d'un espace, qui ne doit pas rester active partout. */
  end?: boolean;
};

const adminNav: NavItem[] = [
  { to: paths.admin.dashboard, label: 'Tableau de bord', icon: '▦', end: true },
  { to: paths.admin.classes, label: 'Classes', icon: '◫' },
  { to: paths.admin.gradeEntry, label: 'Saisie des notes', icon: '✎' },
  { to: paths.admin.subjects, label: 'Matières', icon: '≣' },
  { to: paths.admin.teachers, label: 'Enseignants', icon: '☰' },
  { to: paths.admin.students, label: 'Élèves', icon: '⚇' },
  { to: paths.admin.schoolYears, label: 'Années scolaires', icon: '⟳' },
  { to: paths.admin.archives, label: 'Archives', icon: '⧉' },
  { to: paths.admin.settings, label: 'Paramètres', icon: '⚙' },
];

const teacherNav: NavItem[] = [
  { to: paths.teacher.dashboard, label: 'Mes classes', icon: '▦', end: true },
  { to: paths.teacher.gradeEntry, label: 'Saisie des notes', icon: '✎' },
  { to: paths.teacher.history, label: 'Historique', icon: '↺' },
];

export function navFor(role: Role): NavItem[] {
  if (role === 'admin') return adminNav;
  if (role === 'teacher') return teacherNav;
  return [];
}

export function spaceLabel(role: Role): string {
  if (role === 'admin') return 'Administration';
  if (role === 'teacher') return 'Espace enseignant';
  return 'Espace parent';
}
