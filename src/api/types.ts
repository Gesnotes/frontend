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

// -------------------------------------------------------------------- École

/** `GET /school` — réglages de l'école courante. */
export type SchoolSettings = {
  name: string;
  /** Moyenne à partir de laquelle l'école considère un élève admis. */
  passingGrade: number;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export type UpdateSchoolSettingsPayload = {
  passingGrade?: number;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

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

/** Réponse de `POST /auth/refresh`. */
export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

/**
 * Un autre compte accessible à la même personne : soit détecté
 * automatiquement (même identifiant + mot de passe valides dans une autre
 * école), soit lié explicitement (`POST /auth/link-account`). Porte son
 * propre `refreshToken`, prêt à l'emploi pour basculer via
 * `POST /auth/refresh` sans ressaisir de mot de passe.
 */
export type OtherAccount = {
  userId: ID;
  schoolId: ID;
  schoolName: string;
  role: Role;
  refreshToken: string;
};

/**
 * Réponse de `POST /auth/identify`, seule porte de connexion : aucune école
 * n'est résolue au préalable, l'identifiant est cherché à travers toutes les
 * écoles actives.
 */
export type IdentifyOk = LoginResult & {
  status: 'ok';
  school: { id: ID; name: string };
  otherAccounts: OtherAccount[];
};

export type IdentifyResult =
  | IdentifyOk
  | { status: 'ambiguous'; schools: { id: ID; name: string; city: string | null }[] };

/** Réponse de `GET /me` — le contexte de session, sans identité. */
export type AuthContextPayload = {
  userId: ID;
  schoolId: ID;
  schoolName: string;
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
  /** Période contenant la date du jour. Au plus une l'est. Jamais une archivée. */
  isCurrent: boolean;
  /** Non nul : période archivée, absente des sélecteurs mais rien n'est perdu. */
  archivedAt: string | null;
  /** Ce qu'une suppression définitive emporterait. */
  evaluationCount: number;
  gradeCount: number;
  /** Période terminée : sa date de fin est passée. */
  isClosed: boolean;
  /** Échéance d'une réouverture accordée par l'administration, `null` sinon. */
  reopenedUntil: IsoDateTime | null;
  /**
   * Un enseignant peut y saisir. Calculé par le backend, qui applique la même
   * règle à l'écriture : ne jamais recalculer ici, sous peine d'annoncer une
   * période ouverte que l'API refuserait ensuite.
   */
  isOpenForEntry: boolean;
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

// -------------------------------------------------------- Années scolaires

/** Élément de `GET /school-years`. */
export type SchoolYear = {
  id: ID;
  label: string;
  startDate: IsoDate | null;
  endDate: IsoDate | null;
  /** Année en cours à la date du jour. Au plus une l'est. */
  isCurrent: boolean;
  /** Non nul : l'année est sortie des sélecteurs, sans rien perdre. */
  archivedAt: IsoDateTime | null;
  /** Ce qu'une suppression définitive détacherait (pas ne détruirait pas). */
  termCount: number;
  classCount: number;
};

export type SchoolYearPayload = {
  label: string;
  startDate?: IsoDate | null;
  endDate?: IsoDate | null;
};

// ------------------------------------------------------------------- Classes

/**
 * `notes` : devoirs et compositions notés, bulletin par période.
 * `presence` : maternelle/garderie — la présence remplace la saisie de notes,
 * aucune évaluation ne peut y être créée.
 */
export type ClassMode = 'notes' | 'presence';

/** Élément de `GET /classes`. */
export type ClassListItem = {
  id: ID;
  schoolId: ID;
  name: string;
  level: string;
  mode: ClassMode;
  /** Seul habilité, avec l'administration, à prendre la présence de cette classe. */
  homeroomTeacherId: ID | null;
  schoolYearId: ID | null;
  /** Non nul : cette classe a déjà été préparée pour l'année scolaire suivante. */
  promotesToId: ID | null;
  archivedAt: IsoDateTime | null;
  /** Nombre d'élèves non archivés. */
  effectif: number;
  /** Élèves ayant une moyenne générale publiée sur la période. `null` sans période demandée. */
  evalues: number | null;
  /** `null` si aucune période n'est demandée ou si aucune note n'existe. */
  average: number | null;
};

/** Corps de `POST /classes/:id/duplicate` — prépare la rentrée suivante. */
export type DuplicateClassPayload = {
  schoolYearId: ID;
  name?: string;
  level?: string;
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
  mode: ClassMode;
  termId: ID;
  termLabel: string;
  students: RankedStudentResult[];
  classAverage: number | null;
  stats: ClassStats;
};

export type CreateClassPayload = {
  name: string;
  level: string;
  mode?: ClassMode;
  homeroomTeacherId?: ID;
  schoolYearId?: ID;
  /** Reprend les coefficients d'une classe existante (gabarit de niveau). */
  copyCoefficientsFromClassId?: ID;
};

export type UpdateClassPayload = Partial<Pick<CreateClassPayload, 'name' | 'level' | 'mode'>> & {
  homeroomTeacherId?: ID | null;
  schoolYearId?: ID | null;
};

export type BulletinExportFormat = 'eleves' | 'classe';

// ------------------------------------------------------------------ Présence

export type AttendanceStatus = 'present' | 'absent' | 'late';

/** Élève d'une feuille de présence : son statut du jour, `null` si non encore saisi. */
export type AttendanceSheetStudent = {
  id: ID;
  firstName: string;
  lastName: string;
  status: AttendanceStatus | null;
  comment: string | null;
};

/**
 * Réponse de `GET /teachers/me/attendance` : la classe (mode `presence`) ou
 * le créneau (mode `notes`) entier, pour un jour donné. `slot` porte la
 * matière et l'horaire quand la cible est un créneau, `null` sinon.
 */
export type AttendanceSheet = {
  classId: ID;
  className: string;
  slotId: ID | null;
  slot: { subjectName: string; startTime: string; endTime: string } | null;
  date: IsoDate;
  students: AttendanceSheetStudent[];
};

export type AttendanceEntry = {
  studentId: ID;
  /** `null` efface l'enregistrement du jour pour cet élève. */
  status: AttendanceStatus | null;
  comment?: string | null;
};

/**
 * Corps de `PUT /teachers/me/attendance` : l'état voulu de la journée pour
 * la classe (mode `presence`) ou le créneau (mode `notes`) — l'un ou
 * l'autre, jamais les deux.
 */
export type AttendanceBatchPayload = {
  classId?: ID;
  slotId?: ID;
  date: IsoDate;
  entries: AttendanceEntry[];
};

export type AttendanceSkipReason = 'eleve_hors_classe';

export type AttendanceBatchResult = {
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
  skipped: { studentId: ID; reason: AttendanceSkipReason }[];
};

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

/** `GET /users` — vue unifiée des comptes de l'école (admin + enseignant + parent). */
export type UserAccount = {
  id: ID;
  role: Role;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  archivedAt: IsoDateTime | null;
  createdAt: IsoDateTime | null;
};

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

// ------------------------------------------------------------- Emploi du temps

export type Weekday = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche';

/**
 * Créneau récurrent (jour + horaire) d'une affectation enseignant × classe ×
 * matière. Ne concerne que les classes en mode `notes` — voir `Class.mode`.
 */
export type TimetableSlot = {
  id: ID;
  teacherAssignmentId: ID;
  classId: ID;
  className: string;
  subjectId: ID;
  subjectName: string;
  teacherUserId: ID;
  teacherFirstName: string | null;
  teacherLastName: string | null;
  dayOfWeek: Weekday;
  /** "HH:MM" */
  startTime: string;
  /** "HH:MM" */
  endTime: string;
  archivedAt: IsoDateTime | null;
};

export type CreateSlotPayload = {
  teacherAssignmentId: ID;
  dayOfWeek: Weekday;
  startTime: string;
  endTime: string;
};

export type UpdateSlotPayload = Partial<CreateSlotPayload>;

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

/** Une ligne du fichier d'import, telle que le backend l'a comprise. */
export type ImportRow = {
  /** Numéro de ligne dans le fichier, en-tête comprise : c'est ce que voit l'utilisateur. */
  line: number;
  firstName: string;
  lastName: string;
  className: string;
  birthDate: string | null;
  status: 'create' | 'duplicate' | 'error';
  reason?: string;
};

/** Rapport d'import. `dryRun` vrai : rien n'a été écrit, c'est un aperçu. */
export type ImportReport = {
  rows: ImportRow[];
  counts: { create: number; duplicate: number; error: number };
  dryRun: boolean;
};

/** Association d'un parent : compte existant ou invitation par email. */
export type AttachParentPayload =
  | { parentUserId: ID }
  | { email: string; firstName?: string; lastName?: string; phone?: string };

/** Présence d'un élève, telle que renvoyée par la fiche élève (`GET /students/:id/detail`). */
export type StudentAttendanceRecord = {
  id: ID;
  date: IsoDate;
  status: AttendanceStatus;
  comment: string | null;
};

/** Note d'un élève, telle que renvoyée par la fiche élève. */
export type StudentRecentGrade = {
  id: ID;
  value: number;
  maxValue: number;
  createdAt: IsoDateTime | null;
  matiere: { id: ID; name: string };
  type: { label: string };
  periode: { id: ID; label: string };
};

/**
 * Fiche complète d'un élève (`GET /students/:id/detail`) : identité et
 * parents déjà portés par `Student`, complétés du bulletin de la période
 * choisie (`null` sans période), de la présence et des notes les plus
 * récentes.
 */
export type StudentDetail = Student & {
  bulletin: StudentResult | null;
  presence: StudentAttendanceRecord[];
  dernieresNotes: StudentRecentGrade[];
};

// --------------------------------------------------------------------- Notes

/** Note telle que renvoyée aux enseignants (`/grades`, `/teachers/me/grades`). */
export type Grade = {
  id: ID;
  studentId: ID;
  evaluationId: ID;
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
  evaluation: { id: ID; label: string; date: IsoDate | null };
  matiere: SubjectRef;
  periode: TermRef;
  professeur: PersonRef | null;
};

/** Entrée de l'historique de l'enseignant. */
export type TeacherGradeHistoryItem = Grade & {
  evaluation: { id: ID; label: string; date: IsoDate | null };
  eleve: { id: ID; firstName: string; lastName: string; classId: ID };
  matiere: SubjectRef;
  periode: TermRef;
};

export type CreateGradePayload = {
  evaluationId: ID;
  studentId: ID;
  value: number;
  comment?: string;
};

export type UpdateGradePayload = {
  value?: number;
  comment?: string | null;
};

// ------------------------------------------------------------- Évaluations

/**
 * Une évaluation concrète : « Interro du 12/09 ». C'est elle qui permet
 * plusieurs notes du même type dans une période. Le barème lui appartient ; le
 * poids reste porté par le type de note.
 */
export type Evaluation = {
  id: ID;
  classId: ID;
  subjectId: ID;
  termId: ID;
  teacherUserId: ID | null;
  label: string;
  date: IsoDate | null;
  maxValue: number;
  createdAt: IsoDateTime | null;
  /** Nombre d'élèves déjà notés sur cette évaluation. */
  gradedCount: number;
  type: { id: ID; code: string; label: string; weight: number };
};

export type CreateEvaluationPayload = {
  classId: ID;
  subjectId: ID;
  gradeTypeId: ID;
  termId: ID;
  label: string;
  date?: string | null;
  maxValue?: number;
};

export type UpdateEvaluationPayload = {
  label?: string;
  date?: string | null;
  maxValue?: number;
};

/** Grille de saisie d'une évaluation : ses élèves et leur note (une ou aucune). */
export type EvaluationGrid = {
  evaluation: {
    id: ID;
    classId: ID;
    subjectId: ID;
    termId: ID;
    label: string;
    date: IsoDate | null;
    maxValue: number;
    type: { id: ID; code: string; label: string; weight: number };
  };
  students: {
    id: ID;
    firstName: string;
    lastName: string;
    note: { value: number; comment: string | null } | null;
  }[];
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
 * L'évaluation identifie la colonne de notes ; l'opération est idempotente,
 * donc réémettre le même lot après une coupure réseau ne crée aucun doublon.
 */
export type GradeBatchPayload = {
  evaluationId: ID;
  entries: GradeBatchEntry[];
};

/** Motifs pour lesquels le backend laisse un élève de côté. */
export type GradeBatchSkipReason = 'eleve_hors_classe';

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
  school: { name: string };
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
  /** Présence du jour, classes mode `presence` — indépendante de la période. */
  presence: {
    classesAvecAppel: number;
    classesTotal: number;
    absents: number;
    retards: number;
    classesSansAppel: string[];
  };
  /** Appel du jour, classes mode `notes`, par créneau plutôt que par classe. */
  creneaux: {
    creneauxCouverts: number;
    creneauxTotal: number;
    absents: number;
    retards: number;
    creneauxNonCouverts: {
      slotId: ID;
      className: string;
      subjectName: string;
      startTime: string;
      endTime: string;
    }[];
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

/** Élément de `GET /admin/dashboard/absences` : un point par jour. */
export type AbsenceTrendPoint = {
  date: string;
  absents: number;
  retards: number;
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

/** Élément de `GET /children/:id/attendance` : historique de présence de l'enfant. */
export type ChildAttendanceRecord = {
  id: ID;
  date: IsoDate;
  status: AttendanceStatus;
  comment: string | null;
  classId: ID;
  /** Matière du créneau (classe mode `notes`), `null` pour un appel classique. */
  subjectName: string | null;
};

export type Device = {
  id: ID;
  fcmToken: string;
  createdAt: IsoDateTime | null;
};

// -------------------------------------------------------------- Inscription

/** Corps de `POST /signup-requests` — inscription hybride. */
export type SignupRequestPayload = {
  schoolName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  levels: string[];
};

// ------------------------------------------------------- Réinscription

export type EnrollmentDecisionType = 'promotion' | 'redoublement' | 'autre';

export type EnrollmentEntry = {
  studentId: ID;
  toClassId: ID;
  decision: EnrollmentDecisionType;
};

/**
 * Corps de `POST /classes/:id/enrollment-decisions`.
 *
 * Un élève qui quitte l'école n'y figure pas : cet endpoint ne connaît que des
 * déplacements vers une classe réelle, jamais une sortie. La page appelle
 * séparément l'archivage de l'élève pour ce cas-là.
 */
export type EnrollmentBatchPayload = {
  entries: EnrollmentEntry[];
};

/** Motif pour lequel le backend laisse un élève de côté (déjà sorti de la classe source). */
export type EnrollmentSkipReason = 'eleve_hors_classe';

export type EnrollmentBatchResult = {
  moved: number;
  skipped: { studentId: ID; reason: EnrollmentSkipReason }[];
};

// ------------------------------------------------------ Équipe Gesnotes

/** Compte de l'équipe Gesnotes — hors périmètre multi-écoles. */
export type StaffAuthUser = {
  id: ID;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

/** Réponse de `POST /staff/login` et `POST /staff/refresh`. */
export type StaffLoginResult = {
  accessToken: string;
  refreshToken: string;
  staff: StaffAuthUser;
};

/** Réponse de `GET /staff/overview` : totaux plateforme, tous établissements confondus. */
export type PlatformOverview = {
  schools: number;
  students: number;
  classes: number;
  pendingSignupRequests: number;
  users: { admin: number; teacher: number; parent: number; total: number };
};

/** Élément de `GET /staff/schools`. */
export type SchoolWithMetrics = {
  id: ID;
  name: string;
  city: string | null;
  createdAt: IsoDateTime | null;
  /** Non nul : école suspendue par l'équipe Gesnotes, ses comptes ne peuvent plus se connecter. */
  archivedAt: IsoDateTime | null;
  students: number;
  classes: number;
  admins: number;
  teachers: number;
  parents: number;
};

export type SignupRequestStatus = 'nouveau' | 'traite';

/** Élément de `GET /staff/signup-requests`. */
export type SignupRequestRow = {
  id: ID;
  schoolName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  levels: string[];
  status: SignupRequestStatus;
  schoolId: ID | null;
  createdAt: IsoDateTime | null;
};

/** Corps de `POST /staff/signup-requests/:id/accept` — tout facultatif, dérivé de la demande sinon. */
export type AcceptSignupRequestPayload = {
  schoolName?: string;
  city?: string;
};

export type AcceptSignupRequestResult = {
  school: { id: ID; name: string; city: string | null };
  adminEmail: string;
};
