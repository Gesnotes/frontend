/** Jeu de données de démonstration — École de la Lumière, année 2025-2026. */

export type Role = 'auth' | 'admin' | 'teacher' | 'parent';
export type DemoState = 'ready' | 'loading' | 'empty' | 'error';

export type SchoolClass = { name: string; level: string; students: number; avg: number };
export type Subject = { name: string; coef: number };
export type Teacher = { name: string; email: string; assign: string };
export type Student = { name: string; cls: string; parent: string; avg: number };
export type ClassStudent = { name: string; avg: number };
export type TeacherClass = { name: string; subject: string; students: number; entered: number; total: number };
export type GradeEntryRow = { name: string; value: number | null };
export type HistoryRow = {
  student: string; cls: string; type: string; value: number; period: string; date: string;
};

export type Grade = {
  value: number; max: number; type: string; date: string; coef: number; comment: string;
};
export type ChildSubject = { name: string; coef: number; avg: number; grades: Grade[] };
export type Child = { name: string; cls: string; avg: number; subjects: ChildSubject[] };

/** Note enrichie du nom de sa matière, telle qu'affichée sur l'écran de détail. */
export type GradeWithSubject = Grade & { subject: string };

export const classesData: SchoolClass[] = [
  { name: '6ème A', level: '1er cycle', students: 42, avg: 12.4 },
  { name: '6ème B', level: '1er cycle', students: 40, avg: 11.8 },
  { name: '5ème A', level: '1er cycle', students: 38, avg: 12.9 },
  { name: '4ème A', level: '1er cycle', students: 36, avg: 11.2 },
  { name: '3ème A', level: '1er cycle', students: 34, avg: 13.1 },
  { name: '2nde C', level: '2nd cycle', students: 31, avg: 10.7 },
  { name: '1ère D', level: '2nd cycle', students: 29, avg: 12.2 },
  { name: 'Tle D', level: '2nd cycle', students: 27, avg: 11.9 },
];

export const subjectsData: Subject[] = [
  { name: 'Mathématiques', coef: 5 },
  { name: 'PCT', coef: 4 },
  { name: 'SVT', coef: 3 },
  { name: 'Français', coef: 4 },
  { name: 'Anglais', coef: 3 },
  { name: 'Histoire-Géographie', coef: 2 },
  { name: 'Philosophie', coef: 2 },
  { name: 'EPS', coef: 1 },
];

/** Enseignant affiché en regard de chaque matière (même ordre que subjectsData). */
export const subjectTeachers = [
  'M. Hounkpatin', 'M. Dossou', 'Mme Sossou', 'Mme Agbodjan', 'M. Gbaguidi', '—', '—', '—',
];

export const teachersData: Teacher[] = [
  { name: 'M. Rodrigue Hounkpatin', email: 'r.hounkpatin@ecole-lumiere.bj', assign: 'Maths · 3ème A, 4ème A' },
  { name: 'Mme Chimène Agbodjan', email: 'c.agbodjan@ecole-lumiere.bj', assign: 'Français · 6ème A, 6ème B' },
  { name: 'M. Prince Dossou', email: 'p.dossou@ecole-lumiere.bj', assign: 'PCT · Tle D, 1ère D' },
  { name: 'Mme Nadège Sossou', email: 'n.sossou@ecole-lumiere.bj', assign: 'SVT · 5ème A, 3ème A' },
  { name: 'M. Firmin Gbaguidi', email: 'f.gbaguidi@ecole-lumiere.bj', assign: 'Anglais · 2nde C, 1ère D' },
];

export const studentsData: Student[] = [
  { name: 'Adjovi Ahouandjinou', cls: '3ème A', parent: 'Mme Sylvie Ahouandjinou', avg: 14.2 },
  { name: 'Kossi Zinsou', cls: '3ème A', parent: 'M. Bernard Zinsou', avg: 11.6 },
  { name: 'Mawuena Sagbo', cls: '3ème A', parent: 'Mme Reine Sagbo', avg: 9.4 },
  { name: 'Rodrigue Djossou', cls: '6ème A', parent: 'M. Hervé Djossou', avg: 13.5 },
  { name: 'Fifamè Tchané', cls: '5ème A', parent: '— non associé —', avg: 12.1 },
  { name: 'Prince Assogba', cls: 'Tle D', parent: 'Mme Georgette Assogba', avg: 10.8 },
  { name: 'Chimène Dagba', cls: '2nde C', parent: 'M. Paul Dagba', avg: 8.9 },
  { name: 'Nadège Kpassassi', cls: '4ème A', parent: 'Mme Alice Kpassassi', avg: 15.1 },
];

export const classStudentsData: ClassStudent[] = [
  { name: 'Adjovi Ahouandjinou', avg: 14.2 },
  { name: 'Bénédicta Ahoyo', avg: 13.7 },
  { name: 'Kossi Zinsou', avg: 11.6 },
  { name: 'Landry Houngbédji', avg: 12.8 },
  { name: 'Mawuena Sagbo', avg: 9.4 },
  { name: 'Odette Aïtchédji', avg: 10.2 },
  { name: 'Sylvain Tossou', avg: 13.0 },
  { name: 'Viviane Codjo', avg: 15.3 },
];

export const bulletinSubjects = ['Maths', 'PCT', 'SVT', 'Fr.', 'Ang.', 'H-G'];
export const bulletinCoefs = [5, 4, 3, 4, 3, 2];
export const bulletinRaw: { s: string; g: number[] }[] = [
  { s: 'Adjovi Ahouandjinou', g: [15, 14, 13, 16, 14, 13] },
  { s: 'Bénédicta Ahoyo', g: [13, 12, 15, 14, 13, 15] },
  { s: 'Kossi Zinsou', g: [11, 10, 12, 13, 11, 12] },
  { s: 'Mawuena Sagbo', g: [8, 9, 10, 11, 9, 10] },
  { s: 'Sylvain Tossou', g: [13, 14, 12, 13, 13, 12] },
  { s: 'Viviane Codjo', g: [16, 15, 14, 17, 15, 16] },
];

export const teacherClassesData: TeacherClass[] = [
  { name: '3ème A', subject: 'Mathématiques', students: 34, entered: 34, total: 34 },
  { name: '4ème A', subject: 'Mathématiques', students: 36, entered: 20, total: 36 },
  { name: 'Tle D', subject: 'Mathématiques', students: 27, entered: 0, total: 27 },
];

export const gradeEntryData: GradeEntryRow[] = [
  { name: 'Adjovi Ahouandjinou', value: 15 },
  { name: 'Bénédicta Ahoyo', value: 13 },
  { name: 'Kossi Zinsou', value: 11 },
  { name: 'Landry Houngbédji', value: 12 },
  { name: 'Mawuena Sagbo', value: 8 },
  { name: 'Odette Aïtchédji', value: null },
  { name: 'Sylvain Tossou', value: 13 },
  { name: 'Viviane Codjo', value: 16 },
];

export const teacherHistoryData: HistoryRow[] = [
  { student: 'Adjovi Ahouandjinou', cls: '3ème A', type: 'Composition', value: 15, period: 'Trimestre 2', date: '18 juin' },
  { student: 'Kossi Zinsou', cls: '3ème A', type: 'Devoir', value: 11, period: 'Trimestre 2', date: '18 juin' },
  { student: 'Landry Houngbédji', cls: '4ème A', type: 'Devoir', value: 12, period: 'Trimestre 2', date: '12 juin' },
  { student: 'Viviane Codjo', cls: '3ème A', type: 'Composition', value: 16, period: 'Trimestre 2', date: '18 juin' },
  { student: 'Mawuena Sagbo', cls: '3ème A', type: 'Devoir', value: 8, period: 'Trimestre 1', date: '02 mars' },
];

export const childrenData: Child[] = [
  {
    name: 'Adjovi Ahouandjinou', cls: '3ème A', avg: 14.2,
    subjects: [
      {
        name: 'Mathématiques', coef: 5, avg: 15.0, grades: [
          { value: 15, max: 20, type: 'Composition', date: '18 juin 2026', coef: 3, comment: 'Très bon trimestre, raisonnement solide. Continue ainsi.' },
          { value: 15, max: 20, type: 'Devoir', date: '02 juin 2026', coef: 1, comment: '' },
        ],
      },
      {
        name: 'Français', coef: 4, avg: 16.0, grades: [
          { value: 16, max: 20, type: 'Composition', date: '17 juin 2026', coef: 3, comment: 'Expression écrite remarquable.' },
          { value: 15, max: 20, type: 'Devoir', date: '30 mai 2026', coef: 1, comment: '' },
        ],
      },
      {
        name: 'PCT', coef: 4, avg: 13.5, grades: [
          { value: 14, max: 20, type: 'Composition', date: '16 juin 2026', coef: 3, comment: '' },
          { value: 12, max: 20, type: 'Devoir', date: '28 mai 2026', coef: 1, comment: 'Revoir les unités.' },
        ],
      },
      {
        name: 'Anglais', coef: 3, avg: 14.0, grades: [
          { value: 14, max: 20, type: 'Composition', date: '15 juin 2026', coef: 3, comment: '' },
        ],
      },
    ],
  },
  {
    name: 'Landry Ahouandjinou', cls: '6ème A', avg: 11.8,
    subjects: [
      {
        name: 'Mathématiques', coef: 5, avg: 10.5, grades: [
          { value: 11, max: 20, type: 'Composition', date: '18 juin 2026', coef: 3, comment: 'Des efforts à fournir en géométrie.' },
          { value: 10, max: 20, type: 'Devoir', date: '01 juin 2026', coef: 1, comment: '' },
        ],
      },
      {
        name: 'Français', coef: 4, avg: 13.0, grades: [
          { value: 13, max: 20, type: 'Composition', date: '17 juin 2026', coef: 3, comment: '' },
        ],
      },
      {
        name: 'SVT', coef: 3, avg: 12.5, grades: [
          { value: 13, max: 20, type: 'Devoir', date: '10 juin 2026', coef: 1, comment: 'Bonne participation.' },
        ],
      },
    ],
  },
];

export const recentGrades: [string, string, string, string][] = [
  ['M. Hounkpatin', 'Maths · 3ème A', 'Composition', 'il y a 2 h'],
  ['Mme Agbodjan', 'Français · 6ème A', 'Devoir', 'il y a 5 h'],
  ['Mme Sossou', 'SVT · 5ème A', 'Devoir', 'hier'],
  ['M. Dossou', 'PCT · Tle D', 'Composition', 'hier'],
  ['M. Gbaguidi', 'Anglais · 2nde C', 'Devoir', 'il y a 2 j'],
];

export const periods = ['Trimestre 1', 'Trimestre 2', 'Trimestre 3'];
