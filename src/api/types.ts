/**
 * Types du domaine, calqués sur les réponses réelles du backend
 * (`../../backend/src/routes` et `../../backend/src/services`).
 *
 * Les clés en français sont celles renvoyées par l'API : on ne les renomme pas
 * ici, la traduction vers le vocabulaire de l'UI se fait dans les `select` /
 * adaptateurs de chaque écran. Toute divergence avec le backend doit être
 * corrigée dans ce fichier, jamais contournée dans un composant.
 */

export type ID = number;

/** Chaîne ISO 8601 sérialisée par Express (`2026-06-18T09:12:00.000Z`). */
export type IsoDateTime = string;
/** Date seule (`2026-06-18`). */
export type IsoDate = string;

export type Role = 'admin' | 'teacher' | 'parent';

// ------------------------------------------------------------------- Erreurs

/** Format unique du gestionnaire d'erreurs backend. */
export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

// -------------------------------------------------------------------- Auth

export type AuthUser = {
  id: ID;
  email: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
};

/** Réponse de `POST /auth/login` et `POST /auth/refresh`. */
export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

/** Réponse de `GET /me` — le contexte de session, sans identité. */
export type AuthContextPayload = {
  userId: ID;
  schoolId: ID;
  role: Role;
};

export type MessageResponse = { message: string };

// ------------------------------------------------------- Référentiels communs

export type ClassRef = { id: ID; name: string; level?: string };
export type SubjectRef = { id: ID; name: string };
export type TermRef = { id: ID; label: string };
export type PersonRef = { id: ID; firstName: string | null; lastName: string | null };

/** Période scolaire (`GET /terms`). */
export type Term = {
  id: ID;
  label: string;
  startDate: IsoDate | null;
  endDate: IsoDate | null;
  /** Période contenant la date du jour. Au plus une l'est. */
  isCurrent: boolean;
};

/**
 * Création ou modification d'une période.
 *
 * Les deux dates vont de pair : le backend refuse une période bornée d'un seul
 * côté, faute de quoi `isCurrent` serait incalculable.
 */
export type TermPayload = {
  label: string;
  startDate: IsoDate | null;
  endDate: IsoDate | null;
};

/** Catégorie de note : interrogation (poids 1), devoir (2), composition (3). */
export type GradeType = {
  id: ID;
  code: string;
  label: string;
  weight: number;
  position: number;
};

// ------------------------------------------------------------------- Classes

/** Élément de `GET /classes`. */
export type ClassListItem = {
  id: ID;
  schoolId: ID;
  name: string;
  level: string;
  archivedAt: IsoDateTime | null;
  /** Nombre d'élèves non archivés. */
  effectif: number;
  /** `null` si aucune période n'est demandée ou si aucune note n'existe. */
  average: number | null;
};

/** Moyenne d'une matière pour un élève, avec le détail par catégorie. */
export type SubjectResult = {
  subjectId: ID;
  subjectName: string;
  coefficient: number;
  average: number | null;
  categories: {
    gradeTypeId: ID;
    label: string;
    weight: number;
    average: number | null;
  }[];
};

export type StudentResult = {
  studentId: ID;
  firstName: string;
  lastName: string;
  average: number | null;
  subjects: SubjectResult[];
};

/** Ligne du détail de classe : `StudentResult` enrichi de son rang. */
export type RankedStudentResult = StudentResult & {
  /** `null` pour un élève sans aucune note — il n'est pas « dernier ». */
  rang: number | null;
};

export type ClassStats = {
  effectif: number;
  evalues: number;
  average: number | null;
  meilleure: number | null;
  plusFaible: number | null;
};

/** Réponse de `GET /classes/:id` et `GET /classes/:id/bulletin`. */
export type ClassDetail = {
  classId: ID;
  className: string;
  level: string;
  termId: ID;
  termLabel: string;
  students: RankedStudentResult[];
  classAverage: number | null;
  stats: ClassStats;
};

export type CreateClassPayload = {
  name: string;
  level: string;
  /** Reprend les coefficients d'une classe existante (gabarit de niveau). */
  copyCoefficientsFromClassId?: ID;
};

export type UpdateClassPayload = Partial<Pick<CreateClassPayload, 'name' | 'level'>>;

export type BulletinExportFormat = 'eleves' | 'classe';

// ------------------------------------------------------------------ Matières

export type Subject = {
  id: ID;
  name: string;
  /** Coefficient par défaut de l'école ; surchargeable par classe. */
  coefficient: number;
  archivedAt: IsoDateTime | null;
  coefficientsParClasse: {
    classId: ID;
    className: string;
    level: string;
    coefficient: number;
  }[];
  enseignants: {
    id: ID;
    firstName: string | null;
    lastName: string | null;
    classId: ID;
    className: string;
  }[];
};

export type CreateSubjectPayload = { name: string; coefficient?: number };
export type UpdateSubjectPayload = Partial<CreateSubjectPayload>;

// --------------------------------------------------------------- Enseignants

export type TeacherAssignment = {
  id: ID;
  classId: ID;
  className: string;
  level: string;
  subjectId: ID;
  subjectName: string;
};

export type Teacher = {
  id: ID;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  archivedAt: IsoDateTime | null;
  createdAt: IsoDateTime | null;
  affectations: TeacherAssignment[];
};

export type AssignmentInput = { classId: ID; subjectId: ID };

export type CreateTeacherPayload = {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  assignments?: AssignmentInput[];
};

export type UpdateTeacherPayload = {
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  assignments?: AssignmentInput[];
};

// -------------------------------------------------------------------- Élèves

/** Parent tel qu'exposé à l'administration (coordonnées incluses). */
export type ParentContact = {
  id: ID;
  firstName: string | null;
  lastName: string | null;
  /** Masqué aux enseignants : le backend renvoie alors l'identité seule. */
  email?: string | null;
  phone?: string | null;
};

export type Student = {
  id: ID;
  schoolId: ID;
  classId: ID;
  firstName: string;
  lastName: string;
  birthDate: IsoDate | null;
  archivedAt: IsoDateTime | null;
  createdAt: IsoDateTime | null;
  classe: ClassRef;
  parents: ParentContact[];
};

/** Réponse paginée de `GET /students`. */
export type StudentPage = {
  total: number;
  page: number;
  pageSize: number;
  students: Student[];
};

export type CreateStudentPayload = {
  firstName: string;
  lastName: string;
  classId: ID;
  birthDate?: IsoDate;
};

export type UpdateStudentPayload = {
  firstName?: string;
  lastName?: string;
  classId?: ID;
  birthDate?: IsoDate | null;
};

/** Association d'un parent : compte existant ou invitation par email. */
export type AttachParentPayload =
  | { parentUserId: ID }
  | { email: string; firstName?: string; lastName?: string; phone?: string };

// --------------------------------------------------------------------- Notes

/** Note telle que renvoyée aux enseignants (`/grades`, `/teachers/me/grades`). */
export type Grade = {
  id: ID;
  studentId: ID;
  subjectId: ID;
  termId: ID;
  teacherUserId: ID | null;
  value: number;
  maxValue: number;
  comment: string | null;
  createdAt: IsoDateTime | null;
  type: { id: ID; code: string; label: string; weight: number };
};

/** Note telle que renvoyée aux parents : matière, période et professeur inclus. */
export type ParentGrade = {
  id: ID;
  studentId: ID;
  value: number;
  maxValue: number;
  comment: string | null;
  createdAt: IsoDateTime | null;
  type: { id: ID; code: string; label: string; weight: number };
  matiere: SubjectRef;
  periode: TermRef;
  professeur: PersonRef | null;
};

/** Ligne de la table de saisie : un élève et toutes ses notes du contexte. */
export type GradingTableRow = {
  id: ID;
  firstName: string;
  lastName: string;
  notes: Grade[];
};

/** Entrée de l'historique de l'enseignant. */
export type TeacherGradeHistoryItem = Grade & {
  eleve: { id: ID; firstName: string; lastName: string; classId: ID };
  matiere: SubjectRef;
  periode: TermRef;
};

export type CreateGradePayload = {
  studentId: ID;
  subjectId: ID;
  gradeTypeId: ID;
  termId: ID;
  value: number;
  maxValue?: number;
  comment?: string;
};

export type UpdateGradePayload = {
  value?: number;
  maxValue?: number;
  gradeTypeId?: ID;
  comment?: string | null;
};

/**
 * Réponse de `POST /grades`. `avertissementDoublon` signale qu'une note du
 * même type existe déjà pour cet élève dans cette matière et cette période.
 */
export type CreateGradeResult = {
  note: Grade;
  avertissementDoublon: boolean;
};

// -------------------------------------------------------- Saisie en lot

export type GradeBatchEntry = {
  studentId: ID;
  /** `null` supprime la note de cet élève pour l'évaluation visée. */
  value: number | null;
  comment?: string | null;
};

/**
 * Corps de `PUT /teachers/me/grades`.
 *
 * Le quadruplet identifie une évaluation ; l'opération est idempotente, donc
 * réémettre le même lot après une coupure réseau ne crée aucun doublon.
 */
export type GradeBatchPayload = {
  classId: ID;
  subjectId: ID;
  gradeTypeId: ID;
  termId: ID;
  maxValue?: number;
  entries: GradeBatchEntry[];
};

/** Motifs pour lesquels le backend laisse un élève de côté. */
export type GradeBatchSkipReason = 'eleve_hors_classe' | 'notes_multiples';

export type GradeBatchResult = {
  created: number;
  updated: number;
  deleted: number;
  /** Entrées identiques à l'existant : le lot a déjà été appliqué. */
  unchanged: number;
  skipped: { studentId: ID; reason: GradeBatchSkipReason }[];
};

// ------------------------------------------------------- Espace enseignant

/** Élément de `GET /teachers/me/classes` : une affectation classe × matière. */
export type TeacherClassAssignment = {
  assignmentId: ID;
  classId: ID;
  className: string;
  level: string;
  subjectId: ID;
  subjectName: string;
  effectif: number;
  /** Nombre d'élèves ayant au moins une note dans cette matière. */
  evalues: number;
};

// -------------------------------------------------------- Tableau de bord admin

export type DashboardClassRow = {
  classId: ID;
  className: string;
  level: string;
  effectif: number;
  evalues: number;
  average: number | null;
};

/**
 * Réponse de `GET /admin/dashboard`.
 *
 * Toutes les clés sont toujours présentes : sans `term_id`, les agrégats liés
 * à une période valent `null` ou un tableau vide, jamais `undefined`.
 */
export type AdminDashboard = {
  effectifs: {
    eleves: number;
    classes: number;
    enseignants: number;
    matieres: number;
    parents: number;
  };
  activite: {
    notesDerniers7Jours: number;
    notesTotal: number;
  };
  periode: TermRef | null;
  moyenneEcole: number | null;
  classes: DashboardClassRow[];
  saisie: {
    elevesEvalues: number;
    elevesTotal: number;
    /** Pourcentage entier, `null` si l'école n'a aucun élève. */
    taux: number | null;
    classesSansAucuneNote: string[];
  } | null;
  extremes: {
    meilleureClasse: DashboardClassRow | null;
    plusFaibleClasse: DashboardClassRow | null;
  };
};

/** Élément de `GET /admin/dashboard/recent-grades`. */
export type RecentGrade = {
  id: ID;
  value: number;
  maxValue: number;
  createdAt: IsoDateTime | null;
  eleve: {
    id: ID;
    firstName: string;
    lastName: string;
    classe: ClassRef;
  };
  matiere: SubjectRef;
  type: { label: string; weight: number };
  professeur: PersonRef | null;
  periode: TermRef;
};

// -------------------------------------------------------------- Espace parent

/** Élément de `GET /parents/me/children`. */
export type ChildSummary = {
  id: ID;
  firstName: string;
  lastName: string;
  classe: ClassRef;
  /** `null` tant qu'aucune période n'est demandée. */
  average: number | null;
};

/** Réponse de `GET /children/:id` : résultats de l'enfant sur une période. */
export type ChildDetail = StudentResult & {
  termId: ID;
  termLabel: string;
};

export type Device = {
  id: ID;
  fcmToken: string;
  createdAt: IsoDateTime | null;
};
